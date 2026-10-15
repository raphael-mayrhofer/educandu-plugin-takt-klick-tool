import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import Display from '../../src/takt-klick-tool-display.js';
import Editor from '../../src/takt-klick-tool-editor.js';
import { DEFAULT } from '../../src/rhythm-model.js';
import translations from '../../src/translations.json';

const namespace = 'raphael-mayrhofer/educandu-plugin-takt-klick-tool';
const resources = Object.fromEntries(
  ['de', 'en'].map(language => [
    language,
    {
      [namespace]: Object.fromEntries(
        Object.entries(translations[namespace]).map(([key, value]) => [
          key,
          value[language]
        ])
      )
    }
  ])
);
const ready = i18next.init({
  lng: 'de',
  fallbackLng: 'en',
  resources,
  interpolation: { escapeValue: false }
});
function Preview() {
  const [content, setContent] = useState(DEFAULT);
  const [editing, setEditing] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [inputs, setInputs] = useState(() =>
    JSON.parse(localStorage.getItem('takt-klick-tool-preview') || '[null,null]')
  );
  const update = (index, data) => {
    const next = inputs.map((value, i) => i === index ? data : value);
    setInputs(next);
    localStorage.setItem('takt-klick-tool-preview', JSON.stringify(next));
  };
  return (
    <I18nextProvider i18n={i18next}>
      <h1>Plugin-Prüfansicht</h1>
      <p>
        Lokale Komponentenprüfung ohne Educandu-Server. Eingaben dieser Vorschau
        bleiben in diesem Browser gespeichert.
      </p>
      <button type="button" onClick={() => setEditing(!editing)}>
        Redaktion / Ansicht
      </button>
      <button type="button" onClick={() => setNarrow(!narrow)}>
        Schmal / Breit
      </button>
      <button
        type="button"
        onClick={() =>
          i18next.changeLanguage(i18next.language === 'de' ? 'en' : 'de')}
        >
        Deutsch / English
      </button>
      <div style={{ width: narrow ? 280 : '100%', maxWidth: 1000 }}>
        {editing
          ? (
            <Editor
              content={content}
              context={{ isPreview: true }}
              onContentChanged={setContent}
              />
          )
          :           inputs.map((data, index) => (
            <Display
              key={index}
              content={content}
              context={{ isPreview: true }}
              input={{ data }}
              canModifyInput
              onInputChanged={value => update(index, value)}
              />
          ))}
      </div>
    </I18nextProvider>
  );
}
ready.then(() =>
  createRoot(document.getElementById('preview')).render(<Preview />)
);
