import { google } from 'googleapis';

export type DocSection = {
  title: string;
  body: string;
};

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_JSON not set');

  const key = JSON.parse(keyJson) as { client_email: string; private_key: string };
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/documents'],
  });
}

/**
 * Clears the given Google Doc and writes the sections into it.
 * Each section gets a heading + body paragraph.
 */
export async function updatePlatformDoc(sections: DocSection[]): Promise<void> {
  const docId = process.env.GOOGLE_DOC_ID;
  if (!docId) throw new Error('GOOGLE_DOC_ID not set');

  const auth = getAuth();
  const docs = google.docs({ version: 'v1', auth });

  // Get current doc to find content length
  const doc = await docs.documents.get({ documentId: docId });
  const endIndex = doc.data.body?.content?.at(-1)?.endIndex ?? 1;

  // Clear existing content (keep the very first newline at index 1)
  const requests: Array<Record<string, unknown>> = [];
  if (endIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex: endIndex - 1 },
      },
    });
  }

  // Build the doc title
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Denver' });
  const titleText = `NXT//LINK Platform Features\n`;
  const subtitleText = `Last updated: ${timestamp}\n\n`;

  requests.push(
    { insertText: { location: { index: 1 }, text: titleText } },
    {
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: 1 + titleText.length },
        paragraphStyle: { namedStyleType: 'HEADING_1' },
        fields: 'namedStyleType',
      },
    },
    { insertText: { location: { index: 1 + titleText.length }, text: subtitleText } },
  );

  // Track current insertion point
  let cursor = 1 + titleText.length + subtitleText.length;

  for (const section of sections) {
    const heading = `${section.title}\n`;
    const body = `${section.body}\n\n`;

    requests.push(
      { insertText: { location: { index: cursor }, text: heading } },
      {
        updateParagraphStyle: {
          range: { startIndex: cursor, endIndex: cursor + heading.length },
          paragraphStyle: { namedStyleType: 'HEADING_2' },
          fields: 'namedStyleType',
        },
      },
      { insertText: { location: { index: cursor + heading.length }, text: body } },
      {
        updateParagraphStyle: {
          range: {
            startIndex: cursor + heading.length,
            endIndex: cursor + heading.length + body.length,
          },
          paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
          fields: 'namedStyleType',
        },
      },
    );

    cursor += heading.length + body.length;
  }

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests },
  });
}
