import gulp from 'gulp';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { deleteAsync } from 'del';
import Graceful from 'node-graceful';
import {
  cliArgs,
  compressFiles,
  createGithubRelease,
  createReleaseNotesFromCurrentTag,
  ensureIsValidSemverTag,
  esbuild,
  eslint,
  vitest,
  less,
  MaildevContainer,
  mergeYamlFilesToJson,
  MinioContainer,
  MongoContainer,
  NodeProcess
} from '@educandu/dev-tools';

process.env.NODE_ENV ||= 'development';
if (existsSync('.env')) { process.loadEnvFile('.env'); }

let currentApp = null;
let isInWatchMode = false;
let currentCdnProxy = null;
let currentAppBuildContext = null;

const testAppEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('TEST_APP_')));

const mongoContainer = new MongoContainer({
  port: 27017,
  rootUser: 'root',
  rootPassword: process.env.TEST_APP_MONGO_PASSWORD,
  replicaSetName: 'educandurs'
});

const minioContainer = new MinioContainer({
  port: 9000,
  accessKey: process.env.TEST_APP_CDN_ACCESS_KEY,
  secretKey: process.env.TEST_APP_CDN_SECRET_KEY,
  initialBuckets: ['dev-educandu-cdn']
});

const maildevContainer = new MaildevContainer({
  smtpPort: 8025,
  frontendPort: 8000
});

Graceful.on('exit', async () => {
  await currentAppBuildContext?.dispose();
  await currentApp?.waitForExit();
  await currentCdnProxy?.waitForExit();
});

export async function clean() {
  await deleteAsync(['dist', 'coverage', 'test-app/dist']);
}

export async function lint() {
  await eslint.lint('**/*.js', { failOnError: !isInWatchMode });
}

export async function fix() {
  await eslint.fix('**/*.js');
}

export async function test() {
  await vitest.coverage();
}

export async function testWatch() {
  await vitest.watch();
}

export async function buildJs() {
  await esbuild.transpileDir({ inputDir: 'src', outputDir: 'dist', ignore: '**/*.spec.js' });
}

export async function buildTranslations() {
  await mergeYamlFilesToJson({ inputFilesPattern: './src/**/*.yml', outputFile: './src/translations.json' });
}

export function copyToDist() {
  return gulp.src(['src/**', '!src/**/*.{js,yml}'], { base: 'src' }).pipe(gulp.dest('dist'));
}

export const build = gulp.series(buildTranslations, gulp.parallel(copyToDist, buildJs));

export async function buildTestAppCss() {
  await deleteAsync('test-app/dist/**/*.{css,css.br,css.gz,css.map,css.map.br,css.map.gz}');
  await less.compile({
    inputFile: 'test-app/src/main.less',
    outputFile: 'test-app/dist/[name]-[hash].css',
    optimize: !!cliArgs.optimize
  });
}

export async function buildTestAppJs() {
  await deleteAsync('test-app/dist/**/*.{js,js.br,js.gz,js.map,js.map.br,js.map.gz}');
  if (currentAppBuildContext) {
    await currentAppBuildContext.rebuild();
  } else {
    // eslint-disable-next-line require-atomic-updates
    currentAppBuildContext = await esbuild.bundle({
      entryPoints: ['./test-app/src/main.js'],
      outdir: './test-app/dist',
      minify: !!cliArgs.optimize,
      incremental: isInWatchMode,
      inject: ['./test-app/src/polyfills.js'],
      metaFilePath: './test-app/dist/.meta.json'
    });
  }
}

export async function optimizeTestAppAssets() {
  if (cliArgs.optimize) {
    await compressFiles({ sourceDir: ['./test-app/dist'] });
  }
}

export const compileTestApp = gulp.parallel(buildTestAppCss, buildTranslations, buildTestAppJs);
export const buildTestApp = gulp.series(compileTestApp, optimizeTestAppAssets);

export async function maildevUp() {
  await maildevContainer.ensureIsRunning();
}

export async function maildevDown() {
  await maildevContainer.ensureIsRemoved();
}

export async function mongoUp() {
  await mongoContainer.ensureIsRunning();
}

export async function mongoDown() {
  await mongoContainer.ensureIsRemoved();
}

export async function minioUp() {
  await minioContainer.ensureIsRunning();
}

export async function minioDown() {
  await minioContainer.ensureIsRemoved();
}

export async function startServer() {
  currentCdnProxy = new NodeProcess({
    script: 'node_modules/@educandu/rooms-auth-lambda/src/dev-server/run.js',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: 10000,
      WEBSITE_BASE_URL: 'http://localhost:3000',
      CDN_BASE_URL: 'http://localhost:9000/dev-educandu-cdn',
      SESSION_COOKIE_NAME: testAppEnv.TEST_APP_SESSION_COOKIE_NAME,
      X_ROOMS_AUTH_SECRET: testAppEnv.TEST_APP_X_ROOMS_AUTH_SECRET
    }
  });

  currentApp = new NodeProcess({
    script: 'test-app/src/index.js',
    jsx: true,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      ...testAppEnv
    }
  });

  await Promise.all([
    currentCdnProxy.start(),
    currentApp.start()
  ]);
}

export async function restartServer() {
  await currentApp.restart({
    TEST_APP_SKIP_MAINTENANCE: true.toString()
  });
}

export function verifySemverTag(done) {
  ensureIsValidSemverTag(cliArgs.tag);
  done();
}

export async function release() {
  const { currentTag, releaseNotes } = await createReleaseNotesFromCurrentTag({});

  await createGithubRelease({
    githubToken: cliArgs.githubToken,
    currentTag,
    releaseNotes,
    files: []
  });
}

export const up = gulp.parallel(mongoUp, minioUp, maildevUp);

export const down = gulp.parallel(mongoDown, minioDown, maildevDown);

export const serve = gulp.series(clean, gulp.parallel(up, build), buildTestApp, startServer);

export const verify = gulp.series(lint, test, build);

export function setupWatchMode(done) {
  isInWatchMode = true;
  done();
}

export function startWatchers(done) {
  gulp.watch(['src/**/*.{js,json}', 'test-app/src/**/*.{js,json}'], gulp.series(buildTestAppJs, restartServer));
  gulp.watch(['src/**/*.less', 'test-app/src/**/*.less'], gulp.series(copyToDist, buildTestAppCss));
  gulp.watch(['src/**/*.yml'], buildTranslations);
  done();
}

export const watch = gulp.series(setupWatchMode, serve, startWatchers);

export default watch;

export async function buildPreviewJs() {
  await esbuild.bundle({ entryPoints: ['./test-app/preview/main.js'], outdir: './test-app/preview-dist', entryNames: 'preview', metaFilePath: './test-app/preview-dist/.meta.json' });
}
export async function buildPreviewCss() {
  await less.compile({ inputFile: 'src/takt-klick-tool.less', outputFile: 'test-app/preview-dist/style.css' });
}
export function copyPreview() {
  return gulp.src('test-app/preview/index.html').pipe(gulp.dest('test-app/preview-dist'));
}
export const buildPreview = gulp.series(buildTranslations, gulp.parallel(buildPreviewJs, buildPreviewCss, copyPreview));

// Local-only credentials, generated once and excluded from Git.
export async function setupTestEnvironment() {
  const password = randomBytes(18).toString('hex');
  const env = {
    TEST_APP_PORT: '3000',
    TEST_APP_APP_ROOT_URL: 'http://localhost:3000',
    TEST_APP_MONGO_PASSWORD: password,
    TEST_APP_WEB_CONNECTION_STRING: `mongodb://root:${password}@localhost:27017/dev-educandu-db?replicaSet=educandurs&authSource=admin`,
    TEST_APP_SKIP_MAINTENANCE: 'false',
    TEST_APP_CDN_ENDPOINT: 'http://localhost:9000',
    TEST_APP_CDN_REGION: 'eu-central-1',
    TEST_APP_CDN_ACCESS_KEY: randomBytes(12).toString('hex'),
    TEST_APP_CDN_SECRET_KEY: randomBytes(24).toString('hex'),
    TEST_APP_CDN_BUCKET_NAME: 'dev-educandu-cdn',
    TEST_APP_CDN_ROOT_URL: 'http://localhost:10000',
    TEST_APP_SESSION_SECRET: randomBytes(32).toString('hex'),
    TEST_APP_SESSION_COOKIE_DOMAIN: 'localhost',
    TEST_APP_SESSION_COOKIE_NAME: 'SESSION_ID_TEST_APP',
    TEST_APP_CONSENT_COOKIE_NAME_PREFIX: 'CONSENT_TEST_APP',
    TEST_APP_UPLOAD_LIABILITY_COOKIE_NAME: 'UPLOAD_LIABILITY_TEST_APP',
    TEST_APP_ANNOUNCEMENT_COOKIE_NAME_PREFIX: 'ANNOUNCEMENT_TEST_APP',
    TEST_APP_X_FRAME_OPTIONS: 'SAMEORIGIN',
    TEST_APP_X_ROOMS_AUTH_SECRET: randomBytes(18).toString('hex'),
    TEST_APP_ADMIN_EMAIL_ADDRESS: 'test@example.invalid',
    TEST_APP_EMAIL_SENDER_ADDRESS: 'test@example.invalid',
    TEST_APP_SMTP_OPTIONS: 'smtp://127.0.0.1:8025/?ignoreTLS=true',
    TEST_APP_INITIAL_USER: JSON.stringify({ email: 'test@example.invalid', password: randomBytes(18).toString('hex'), displayName: 'Test' })
  };
  await writeFile('.env', Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n'), { flag: 'wx', mode: 0o600 });
}
