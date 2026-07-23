const RESPONSIVE_EMAIL_STYLE_ID = 'supermailbox-responsive-email-fixes';

const RESPONSIVE_EMAIL_CSS = `
<style id="${RESPONSIVE_EMAIL_STYLE_ID}">
  @media only screen and (max-width: 480px) {
    body {
      margin: 0 !important;
      padding: 0 !important;
    }

    div[style*="max-width:600px"],
    div[style*="max-width: 600px"],
    table[style*="max-width:600px"],
    table[style*="max-width: 600px"] {
      width: 100% !important;
      max-width: 100% !important;
    }

    div[style*="display:flex"],
    div[style*="display: flex"] {
      display: block !important;
    }

    div[style*="flex:0 0 180px"],
    div[style*="flex: 0 0 180px"],
    div[style*="width:180px"],
    div[style*="width: 180px"] {
      width: 150px !important;
      max-width: 72% !important;
      margin: 0 auto 18px auto !important;
    }

    a[style*="linear-gradient"],
    a[style*="background: linear-gradient"] {
      display: block !important;
      width: 100% !important;
      max-width: 260px !important;
      margin: 0 auto !important;
      padding: 14px 16px !important;
      text-align: center !important;
      white-space: normal !important;
      word-break: normal !important;
      box-sizing: border-box !important;
    }

    h1, h2, h3, p {
      text-align: left !important;
    }
  }
</style>`;

export function addResponsiveEmailFixes(html: string): string {
  if (!html || html.includes(`id="${RESPONSIVE_EMAIL_STYLE_ID}"`)) return html;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${RESPONSIVE_EMAIL_CSS}\n</head>`);
  }

  return `${RESPONSIVE_EMAIL_CSS}\n${html}`;
}
