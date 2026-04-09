import { useState, useCallback } from 'react';
import type { RuleTemplate } from '../types';

const STORAGE_KEY = 'circuit-rule-templates';
const ACTIVE_KEY = 'circuit-active-template';

export const DEFAULT_TEMPLATE: RuleTemplate = {
  id: 'default',
  name: '默认模板',
  description: '系统内置默认规则，适用于大多数车型',
  isBuiltin: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  connectionRules: {
    fuseBoxContainedTypes: ['fuse', 'relay'],
    groundPlacement: 'below_controller',
    powerOutputPorts: [
      { id: 'IG', label: '点火电源', description: '钥匙ON档供电' },
      { id: 'ACC', label: '附件电源', description: 'ACC档供电' },
      { id: 'B+', label: '常电', description: '蓄电池直接供电' },
    ],
    fuseBoxIndependentWiring: true,
    connectionConstraints: [
      { fromType: 'fuse', toType: 'power', required: true, description: '保险丝必须连接到电源' },
      { fromType: 'relay', toType: 'power', required: true, description: '继电器线圈端必须连接电源' },
    ],
  },
  wireRules: {
    colorCodeMap: {
      R: '#e53e3e', B: '#3182ce', G: '#38a169', Y: '#d69e2e',
      W: '#a0aec0', Br: '#8B4513', O: '#dd6b20', P: '#ed64a6',
      V: '#805ad5', Gr: '#718096', Black: '#333333',
    },
    multiColorSeparator: '/',
    primaryWidth: 4,
    secondaryWidth: 1.5,
    labelFormat: '{colorCode} {gauge}mm²',
    labelVisible: true,
  },
  layoutRules: {
    defaultDirection: 'vertical',
    verticalCondition: {
      requirePower: true,
      requireController: true,
      requireBalancedPins: false,
    },
    layerMode: 'auto',
    layerTemplate: [
      { id: 'power', label: '电源', types: ['power'] },
      { id: 'protection', label: '保护/控制', types: ['fuse', 'relay'] },
      { id: 'switch', label: '开关/接头', types: ['switch', 'splice'] },
      { id: 'ecu', label: '控制器', types: ['ecu', 'ic'] },
      { id: 'sensor_actuator', label: '检测/执行', types: ['sensor', 'actuator', 'resistor', 'capacitor', 'diode', 'transistor'] },
      { id: 'connector', label: '连接器', types: ['connector', 'connector_plug'] },
      { id: 'ground', label: '接地', types: ['ground'] },
    ],
    layerSpacing: 120,
    nodeSpacing: 80,
    inlineGap: 20,
    sortStrategy: 'barycenter',
    barycenterIterations: 4,
  },
  pinRules: {
    labelPosition: 'outside',
    labelFormat: '{pinId}',
    showPinsInsideController: false,
    autoDetectDirection: true,
  },
};

function loadTemplates(): RuleTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveTemplates(templates: RuleTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function loadActiveId(): string {
  return localStorage.getItem(ACTIVE_KEY) || 'default';
}

function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function useTemplateStore() {
  const [customTemplates, setCustomTemplates] = useState<RuleTemplate[]>(loadTemplates);
  const [activeId, setActiveId] = useState<string>(loadActiveId);

  const allTemplates = [DEFAULT_TEMPLATE, ...customTemplates];
  const activeTemplate = allTemplates.find(t => t.id === activeId) || DEFAULT_TEMPLATE;

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    saveActiveId(id);
  }, []);

  const createTemplate = useCallback((base: RuleTemplate, name: string) => {
    const now = new Date().toISOString();
    const newTpl: RuleTemplate = {
      ...structuredClone(base),
      id: `tpl_${Date.now()}`,
      name,
      isBuiltin: false,
      createdAt: now,
      updatedAt: now,
    };
    setCustomTemplates(prev => {
      const next = [...prev, newTpl];
      saveTemplates(next);
      return next;
    });
    return newTpl.id;
  }, []);

  const updateTemplate = useCallback((id: string, patch: Partial<RuleTemplate>) => {
    setCustomTemplates(prev => {
      const next = prev.map(t =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      );
      saveTemplates(next);
      return next;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setCustomTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      saveTemplates(next);
      return next;
    });
    if (activeId === id) {
      setActiveId('default');
      saveActiveId('default');
    }
  }, [activeId]);

  const duplicateTemplate = useCallback((id: string) => {
    const source = allTemplates.find(t => t.id === id);
    if (!source) return;
    return createTemplate(source, `${source.name} (副本)`);
  }, [allTemplates, createTemplate]);

  const exportTemplate = useCallback((id: string) => {
    const tpl = allTemplates.find(t => t.id === id);
    if (!tpl) return;
    const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tpl.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [allTemplates]);

  const importTemplate = useCallback((json: string) => {
    const tpl = JSON.parse(json) as RuleTemplate;
    tpl.id = `tpl_${Date.now()}`;
    tpl.isBuiltin = false;
    tpl.updatedAt = new Date().toISOString();
    setCustomTemplates(prev => {
      const next = [...prev, tpl];
      saveTemplates(next);
      return next;
    });
    return tpl.id;
  }, []);

  return {
    allTemplates,
    activeTemplate,
    activeId,
    setActive,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    exportTemplate,
    importTemplate,
  };
}
