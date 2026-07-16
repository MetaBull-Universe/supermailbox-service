const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/SegmentBuilder.tsx',
  'src/pages/TemplateBuilder.tsx',
  'src/pages/SuppressionManager.tsx'
];

const replacements = [
  { from: /#EFF6FF/g, to: 'rgba(59, 130, 246, 0.15)' },
  { from: /#D1FAE5/g, to: 'rgba(16, 185, 129, 0.15)' },
  { from: /#FEE2E2/g, to: 'rgba(239, 68, 68, 0.15)' },
  { from: /#FEF3C7/g, to: 'rgba(245, 158, 11, 0.15)' },
  { from: /#E0E7FF/g, to: 'rgba(99, 102, 241, 0.15)' },
  { from: /#F3F4F6/g, to: 'rgba(255, 255, 255, 0.05)' },
  { from: /#F9FAFB/g, to: 'rgba(255, 255, 255, 0.02)' },
  { from: /#FFFFFF/gi, to: 'var(--text-main)' }, // Mostly text now, or we can leave it. Actually, wait. background: '#FFFFFF' needs to be var(--bg-surface).
  { from: /background:\s*['"]#fff['"]/gi, to: "background: 'var(--bg-surface)'" },
  { from: /background:\s*['"]#ffffff['"]/gi, to: "background: 'var(--bg-surface)'" },
  { from: /color:\s*['"]#065F46['"]/g, to: "color: 'var(--tertiary)'" },
  { from: /color:\s*['"]#991B1B['"]/g, to: "color: 'var(--error)'" },
  { from: /color:\s*['"]#92400E['"]/g, to: "color: 'var(--warning)'" },
  { from: /color:\s*['"]#3730A3['"]/g, to: "color: '#818cf8'" },
  { from: /color:\s*['"]#374151['"]/g, to: "color: 'var(--text-muted)'" },
  { from: /color:\s*['"]#111827['"]/g, to: "color: 'var(--text-main)'" },
  { from: /color:\s*['"]#4B5563['"]/g, to: "color: 'var(--text-body)'" },
  { from: /color:\s*['"]#6B7280['"]/g, to: "color: 'var(--text-muted)'" },
  { from: /border:\s*['"]1px solid #E5E7EB['"]/g, to: "border: '1px solid var(--border-color)'" },
  { from: /border:\s*['"]1px solid #D1D5DB['"]/g, to: "border: '1px solid var(--border-color)'" },
  { from: /boxShadow:\s*['"][^'"]*rgba\(0, 82, 255, 0.12\)['"]/g, to: "boxShadow: 'var(--shadow-card)'" },
  { from: /boxShadow:\s*['"][^'"]*rgba\(0, 82, 255, 0.08\)['"]/g, to: "boxShadow: 'var(--shadow-card)'" }
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add glass-panel class to main container divs where appropriate if they have bg-surface
    content = content.replace(/style=\{\{\s*background:\s*'var\(--bg-surface\)'/g, 'className="glass-panel"\n                style={{');

    replacements.forEach(r => {
      content = content.replace(r.from, r.to);
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
