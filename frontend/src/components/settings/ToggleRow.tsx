import React from 'react';
import { motion } from 'framer-motion';

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ icon, label, desc, checked, onChange }) => {
  return (
    <div className="glass-panel" style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px', transition: 'all 200ms ease', border: '1px solid rgba(15,95,115,0.08)' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ 
          width: 40, height: 40, borderRadius: 10, background: 'rgba(15,95,115,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          {icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-mid)', margin: 0 }}>{desc}</p>
        </div>
      </div>
      <button 
        type="button"
        onClick={onChange}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', position: 'relative',
          background: checked ? 'var(--color-primary)' : 'rgba(15,95,115,0.2)',
          cursor: 'pointer', transition: 'all 240ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <motion.div 
          animate={{ x: checked ? 22 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 4 }} 
        />
      </button>
    </div>
  );
};

export default ToggleRow;
