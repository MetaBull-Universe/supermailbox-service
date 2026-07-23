import React, { useState } from 'react';
import { Sparkles, Layout, Code, Monitor, Smartphone, Save, Check, Plus, X, Layers } from 'lucide-react';
import type { Template } from '../services/api';

interface TemplateBuilderProps {
  templates: Template[];
  onPromoteVersion?: (templateKey: string, versionName: string) => void;
  onSaveDraft?: (templateKey: string, subject: string, html: string) => void;
  onCreateTemplate?: (newTemplate: Template) => void;
}

interface SimpleEmailContent {
  badgeText: string;
  heading: string;
  body: string;
  featureBox: 'none' | 'otp' | 'receipt';
  ctaLabel: string;
  ctaUrl: string;
  footerText: string;
}

const RESPONSIVE_EMAIL_STYLE_ID = 'supermailbox-responsive-email-fixes';

const addResponsiveEmailFixes = (html: string) => {
  if (!html || html.includes(`id="${RESPONSIVE_EMAIL_STYLE_ID}"`)) return html;

  const style = `<style id="${RESPONSIVE_EMAIL_STYLE_ID}">
@media only screen and (max-width: 480px) {
  body { margin: 0 !important; padding: 0 !important; }
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
  h1, h2, h3, p { text-align: left !important; }
}
</style>`;

  return html.includes('</head>') ? html.replace('</head>', `${style}</head>`) : `${style}${html}`;
};

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  templates,
  onSaveDraft,
  onCreateTemplate,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>(templates[0]?.key || 'auth_welcome');
  const activeTemplate = templates.find((t) => t.key === selectedKey) || templates[0];

  const liveVersion = activeTemplate?.versions.find((v) => v.status === 'Live') || activeTemplate?.versions[0];
  const [subject, setSubject] = useState(liveVersion?.subject || 'Welcome to GetAIPilot! 🚀');

  const [accentColor, setAccentColor] = useState<string>('#0f172a');

  const [content, setContent] = useState<SimpleEmailContent>({
    badgeText: 'ACCOUNT VERIFICATION',
    heading: 'Welcome Aboard, {"{{name}}"}! 🎉',
    body: 'We are thrilled to have you onboard. Please use the verification code below to confirm your session.',
    featureBox: 'otp',
    ctaLabel: 'Launch Dashboard →',
    ctaUrl: 'https://getaipilot.com/app',
    footerText: '© 2026 GetAIPilot Core Platform. All rights reserved. You received this email because you registered on GetAIPilot.'
  });

  const [mode, setMode] = useState<'simple' | 'ai' | 'code'>(liveVersion?.html ? 'code' : 'simple');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showSampleData, setShowSampleData] = useState<boolean>(true);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTmplName, setNewTmplName] = useState<string>('');
  const [newTmplKey, setNewTmplKey] = useState<string>('');
  const [newTmplCategory] = useState<string>('transactional');

  // Light Theme Compiled HTML
  const generateCompiledHtml = () => {
    const badgeHtml = content.badgeText
      ? `<div style="text-align: center; margin-bottom: 22px;">
  <span style="background: ${accentColor}; color: white; padding: 6px 16px; border-radius: 999px; font-weight: 600; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase;">
    ${content.badgeText}
  </span>
</div>`
      : '';

    const headingHtml = content.heading
      ? `<div style="text-align: center; margin-bottom: 20px;">
  <h1 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${content.heading}</h1>
</div>`
      : '';

    const bodyHtml = content.body
      ? `<div style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${content.body.replace(/\n/g, '<br/>')}
</div>`
      : '';

    let featureHtml = '';
    if (content.featureBox === 'otp') {
      featureHtml = `<div style="margin: 28px auto; text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; max-width: 280px;">
  <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; font-family: -apple-system, sans-serif;">Security Code</div>
  <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; color: ${accentColor}; letter-spacing: 0.1em;">{{otp_code}}</span>
</div>`;
    } else if (content.featureBox === 'receipt') {
      featureHtml = `<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; font-family: -apple-system, sans-serif;">
  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 14px;">
    <span style="color: #64748b; font-size: 14px;">Invoice Number</span>
    <strong style="color: #0f172a; font-size: 14px;">{{invoice_id}}</strong>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <span style="color: #64748b; font-size: 14px;">Total Paid</span>
    <strong style="color: #059669; font-size: 22px; font-weight: 700;">{{amount}}</strong>
  </div>
</div>`;
    }

    const ctaHtml = content.ctaLabel
      ? `<div style="text-align: center; margin: 32px 0;">
  <a href="${content.ctaUrl || 'https://getaipilot.com'}" style="display: inline-block; background: ${accentColor}; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-family: -apple-system, sans-serif;">
    ${content.ctaLabel}
  </a>
</div>`
      : '';

    const footerHtml = content.footerText
      ? `<div style="border-top: 1px solid #f1f5f9; margin-top: 36px; padding-top: 24px; text-align: center;">
  <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0; font-family: -apple-system, sans-serif;">${content.footerText}</p>
</div>`
      : '';

    return `<div style="background: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
${badgeHtml}
${headingHtml}
${bodyHtml}
${featureHtml}
${ctaHtml}
${footerHtml}
</div>`;
  };

  const [customHtml, setCustomHtml] = useState<string | null>(liveVersion?.html || null);

  const sampleData: Record<string, string> = {
    name: 'Aarav Sharma',
    full_name: 'Aarav Sharma',
    otp_code: '849-201',
    amount: '₹2,499',
    invoice_id: 'INV-2026-9814',
    wallet_balance: '₹14,500',
    ConfirmationURL: 'https://mail.getaipilot.in/verify?preview=true',
    confirmation_url: 'https://mail.getaipilot.in/verify?preview=true',
    confirmationUrl: 'https://mail.getaipilot.in/verify?preview=true',
    verify_url: 'https://mail.getaipilot.in/verify?preview=true'
  };

  const getActiveHtml = () => addResponsiveEmailFixes(customHtml !== null ? customHtml : generateCompiledHtml());

  const getRenderedPreview = () => {
    let previewHtml = getActiveHtml();
    if (!showSampleData) return previewHtml;
    Object.entries(sampleData).forEach(([key, val]) => {
      previewHtml = previewHtml.replace(new RegExp(`\\{\\{\\s*\\.?\\s*${key}\\s*\\}\\}`, 'g'), val);
    });
    return previewHtml;
  };

  const handleTemplateSelect = (key: string) => {
    setSelectedKey(key);
    const tmpl = templates.find((t) => t.key === key);
    if (tmpl) {
      const ver = tmpl.versions.find((v) => v.status === 'Live') || tmpl.versions[0];
      setSubject(ver?.subject || '');
      
      if (ver?.html) {
        setCustomHtml(ver.html);
        setMode('code');
      } else {
        setCustomHtml(null);
        setMode('simple');
      }

      // Keep updating the form fallbacks just in case user switches to simple mode

      if (key.includes('billing') || key.includes('receipt') || key.includes('payment')) {
        setAccentColor('#059669');
        setContent({
          badgeText: 'PAYMENT CONFIRMED',
          heading: 'Payment Received Successfully! 💳',
          body: 'Hi {{name}}, we have processed your payment successfully. Here is your transaction summary:',
          featureBox: 'receipt',
          ctaLabel: 'Download Invoice PDF →',
          ctaUrl: 'https://getaipilot.com/billing',
          footerText: '© 2026 GetAIPilot Billing Services. All rights reserved.'
        });
      } else if (key.includes('welcome') || key.includes('auth')) {
        setAccentColor('#2563eb');
        setContent({
          badgeText: 'ACCOUNT VERIFICATION',
          heading: 'Welcome Aboard, {{name}}! 🎉',
          body: 'We are thrilled to have you onboard. Please use the security verification code below to confirm your login session.',
          featureBox: 'otp',
          ctaLabel: 'Launch Dashboard →',
          ctaUrl: 'https://getaipilot.com/app',
          footerText: '© 2026 GetAIPilot Core Platform. All rights reserved.'
        });
      } else {
        setAccentColor('#0f172a');
        setContent({
          badgeText: 'EXCITING NEWS',
          heading: 'New Announcement for {{name}} 🚀',
          body: 'We have launched new autonomous features to help you automate workflows and boost productivity.',
          featureBox: 'none',
          ctaLabel: 'Explore Features →',
          ctaUrl: 'https://getaipilot.com/features',
          footerText: '© 2026 GetAIPilot Core Platform. All rights reserved.'
        });
      }
    }
  };

  const handleGenerateAi = (promptText: string) => {
    setIsGenerating(true);
    setTimeout(() => {
      if (promptText.toLowerCase().includes('payment') || promptText.toLowerCase().includes('receipt')) {
        setSubject('Payment Confirmed - Receipt {{invoice_id}} 💳');
        setAccentColor('#059669');
        setContent({
          badgeText: 'PAYMENT CONFIRMED',
          heading: 'Payment Received Successfully! 💳',
          body: 'Hi {{name}}, your payment was processed successfully. Thank you for your continued partnership!',
          featureBox: 'receipt',
          ctaLabel: 'Download Invoice PDF →',
          ctaUrl: 'https://getaipilot.com/billing',
          footerText: '© 2026 GetAIPilot Billing Services. All rights reserved.'
        });
      } else if (promptText.toLowerCase().includes('welcome') || promptText.toLowerCase().includes('otp')) {
        setSubject('Welcome to GetAIPilot Autonomous Suite 🚀');
        setAccentColor('#2563eb');
        setContent({
          badgeText: 'ACCOUNT VERIFIED',
          heading: 'Welcome Aboard, {{name}}! 🎉',
          body: 'We are thrilled to have you onboard. Use your security code below to complete sign-in:',
          featureBox: 'otp',
          ctaLabel: 'Launch Dashboard →',
          ctaUrl: 'https://getaipilot.com/app',
          footerText: '© 2026 GetAIPilot Core Platform. All rights reserved.'
        });
      } else {
        setSubject('Exciting Update: New Features Live! ✨');
        setAccentColor('#0f172a');
        setContent({
          badgeText: 'PRODUCT ANNOUNCEMENT',
          heading: 'Supercharge Your Email Workflows ⚡',
          body: 'Hi {{name}}, our team has just deployed major updates including 1-click broadcasts and smart suppression management.',
          featureBox: 'none',
          ctaLabel: 'See What’s New →',
          ctaUrl: 'https://getaipilot.com/changelog',
          footerText: '© 2026 GetAIPilot Product Team. All rights reserved.'
        });
      }
      setIsGenerating(false);
      setMode('simple');
    }, 500);
  };

  const handleSave = () => {
    if (onSaveDraft) {
      onSaveDraft(selectedKey, subject, getActiveHtml());
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCreateNewTemplate = () => {
    if (!newTmplName.trim()) return;
    const key = newTmplKey.trim() || newTmplName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const newTmpl: Template = {
      key,
      name: newTmplName,
      category: (newTmplCategory === 'marketing' ? 'marketing' : 'transactional'),
      versions: [
        {
          version: 'v1.0.0',
          status: 'Live',
          html: getActiveHtml(),
          subject: subject,
          author: 'Admin User',
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          variables: ['name', 'otp_code', 'amount']
        }
      ]
    };
    if (onCreateTemplate) {
      onCreateTemplate(newTmpl);
    }
    setSelectedKey(key);
    setShowCreateModal(false);
    setNewTmplName('');
    setNewTmplKey('');
  };

  return (
    <div className="template-workshop">
      
      {/* Background Dotted Canvas */}
      <div className="template-grid-bg" style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
      }} />

      {/* LEFT FLOATING PROPERTIES PANEL */}
      <div className="template-tools-panel" style={{
        position: 'relative',
        zIndex: 10,
        width: '380px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        
        {/* Template Selector Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Template</span>
            <button onClick={() => setShowCreateModal(true)} style={{ background: 'transparent', border: 'none', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> New
            </button>
          </div>
          <select value={selectedKey} onChange={(e) => handleTemplateSelect(e.target.value)} className="ui-input" style={{ width: '100%', fontWeight: 600, fontSize: '0.9375rem', boxShadow: 'none' }}>
            {templates.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
          </select>
        </div>

        {/* Tabbed Editor Modes */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', background: 'var(--bg-subsurface)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button onClick={() => { setMode('simple'); setCustomHtml(null); }} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', border: 'none', background: mode === 'simple' ? 'var(--bg-surface)' : 'transparent', color: mode === 'simple' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', boxShadow: mode === 'simple' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s ease' }}>
              <Layout size={14} /> Form
            </button>
            <button onClick={() => setMode('ai')} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', border: 'none', background: mode === 'ai' ? 'var(--bg-surface)' : 'transparent', color: mode === 'ai' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', boxShadow: mode === 'ai' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s ease' }}>
              <Sparkles size={14} /> AI
            </button>
            <button onClick={() => { if (customHtml === null) setCustomHtml(generateCompiledHtml()); setMode('code'); }} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', border: 'none', background: mode === 'code' ? 'var(--bg-surface)' : 'transparent', color: mode === 'code' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', boxShadow: mode === 'code' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s ease' }}>
              <Code size={14} /> Code
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Email Subject Line</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="ui-input" style={{ width: '100%', fontWeight: 500, boxShadow: 'none' }} />
          </div>

          {mode === 'simple' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
              
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Badge Label</label>
                <input type="text" value={content.badgeText} onChange={(e) => setContent({ ...content, badgeText: e.target.value })} className="ui-input" style={{ width: '100%', boxShadow: 'none' }} />
              </div>
              
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Main Heading</label>
                <input type="text" value={content.heading} onChange={(e) => setContent({ ...content, heading: e.target.value })} className="ui-input" style={{ width: '100%', boxShadow: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Body Text</label>
                <textarea value={content.body} onChange={(e) => setContent({ ...content, body: e.target.value })} className="ui-input" style={{ width: '100%', height: '100px', resize: 'vertical', boxShadow: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Feature Block</label>
                <select value={content.featureBox} onChange={(e) => setContent({ ...content, featureBox: e.target.value as any })} className="ui-input" style={{ width: '100%', boxShadow: 'none' }}>
                  <option value="none">None (Standard Text)</option>
                  <option value="otp">Security Code Box</option>
                  <option value="receipt">Invoice Receipt</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>CTA Button</label>
                  <input type="text" value={content.ctaLabel} onChange={(e) => setContent({ ...content, ctaLabel: e.target.value })} className="ui-input" style={{ width: '100%', boxShadow: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>CTA URL</label>
                  <input type="text" value={content.ctaUrl} onChange={(e) => setContent({ ...content, ctaUrl: e.target.value })} className="ui-input" style={{ width: '100%', boxShadow: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Footer Notes</label>
                <input type="text" value={content.footerText} onChange={(e) => setContent({ ...content, footerText: e.target.value })} className="ui-input" style={{ width: '100%', fontSize: '0.75rem', boxShadow: 'none' }} />
              </div>
            </div>
          )}

          {mode === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--primary-light)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>AI Email Architect</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', margin: 0 }}>Describe the email purpose and the AI will construct the ideal layout and copy.</p>
              </div>
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g. Write a friendly welcome email for new users..." className="ui-input" style={{ width: '100%', height: '140px', boxShadow: 'none' }} />
              <button onClick={() => handleGenerateAi(aiPrompt)} disabled={isGenerating} className="btn-primary" style={{ width: '100%' }}>
                {isGenerating ? 'Architecting...' : 'Generate Design'}
              </button>
            </div>
          )}

          {mode === 'code' && (
            <textarea value={getActiveHtml()} onChange={(e) => setCustomHtml(e.target.value)} className="ui-input" style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', background: 'var(--bg-subsurface)', resize: 'none', border: '1px solid var(--border-color)', outline: 'none', minHeight: '400px' }} spellCheck={false} />
          )}

        </div>
      </div>

      {/* CENTER STAGE (CANVAS) */}
      <div className="template-preview-stage">
        
        {/* The Device/Browser Frame */}
        <div className="template-device-frame" style={{
          width: previewMode === 'desktop' ? '680px' : '340px',
          borderRadius: previewMode === 'desktop' ? '12px' : '36px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0
        }}>
          {/* Faux Header (Browser or Mobile Notch) */}
          {previewMode === 'desktop' ? (
            <div style={{ height: '40px', background: 'var(--bg-subsurface)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '6px', width: '200px', height: '24px' }} />
              </div>
            </div>
          ) : (
            <div style={{ height: '30px', background: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
              <div style={{ width: '120px', height: '24px', background: '#000000', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }} />
            </div>
          )}

          {/* Rendered Output */}
          <div style={{ flex: 1, padding: previewMode === 'desktop' ? '40px' : '10px', background: '#ffffff', overflowY: 'auto' }}>
             <div className={previewMode === 'mobile' ? 'email-mobile-preview' : undefined} dangerouslySetInnerHTML={{ __html: getRenderedPreview() }} />
          </div>
        </div>

      </div>

      {/* FLOATING ACTION BAR (Bottom Center) */}
      <div className="template-action-bar" style={{
        position: 'absolute',
        bottom: '30px',
        left: 'calc(50% + 190px)', // Offset by half the sidebar width
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-subsurface)', padding: '4px', borderRadius: '999px' }}>
          <button onClick={() => setPreviewMode('desktop')} style={{ background: previewMode === 'desktop' ? '#ffffff' : 'transparent', color: previewMode === 'desktop' ? 'var(--text-main)' : 'var(--text-muted)', border: 'none', padding: '6px 12px', borderRadius: '999px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, boxShadow: previewMode === 'desktop' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s ease' }}>
            <Monitor size={14} /> Desktop
          </button>
          <button onClick={() => setPreviewMode('mobile')} style={{ background: previewMode === 'mobile' ? '#ffffff' : 'transparent', color: previewMode === 'mobile' ? 'var(--text-main)' : 'var(--text-muted)', border: 'none', padding: '6px 12px', borderRadius: '999px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, boxShadow: previewMode === 'mobile' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s ease' }}>
            <Smartphone size={14} /> Mobile
          </button>
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />

        <button onClick={() => setShowSampleData(!showSampleData)} style={{ background: 'transparent', border: 'none', color: showSampleData ? 'var(--secondary)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} /> {showSampleData ? 'Real Data' : 'Raw Variables'}
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />

        <button onClick={handleSave} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '0.8125rem' }}>
          {saveSuccess ? <Check size={14} /> : <Save size={14} />}
          {saveSuccess ? 'Saved' : 'Save Template'}
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Create Template</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'var(--bg-subsurface)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Template Name</label>
                <input type="text" value={newTmplName} onChange={(e) => { setNewTmplName(e.target.value); setNewTmplKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')); }} placeholder="e.g. Monthly Newsletter" className="ui-input" style={{ width: '100%', boxShadow: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Unique Key</label>
                <input type="text" value={newTmplKey} onChange={(e) => setNewTmplKey(e.target.value)} placeholder="e.g. monthly_newsletter" className="ui-input" style={{ width: '100%', fontFamily: 'var(--font-mono)', boxShadow: 'none' }} />
              </div>
            </div>
            
            <button onClick={handleCreateNewTemplate} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.9375rem' }}>Create & Select</button>
          </div>
        </div>
      )}

    </div>
  );
};
