import React from 'react';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { sectionEditorProps } from '@educandu/educandu/ui/default-prop-types.js';
import TaktKlickToolDisplay from './takt-klick-tool-display.js';

export default function TaktKlickToolEditor({ content, onContentChanged }) {
  const { t } = useTranslation(
    'raphael-mayrhofer/educandu-plugin-takt-klick-tool'
  );
  return (
    <Form layout="vertical" className="EP_RaphaelMayrhofer_TaktKlickTool_Editor">
      <p>{t('editorHint')}</p>
      <TaktKlickToolDisplay
        content={content}
        context={{ isPreview: true }}
        input={{ data: null }}
        canModifyInput
        onInputChanged={data => onContentChanged(data.state)}
        />
    </Form>
  );
}
TaktKlickToolEditor.propTypes = { ...sectionEditorProps };
