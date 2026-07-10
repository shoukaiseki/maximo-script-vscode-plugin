import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    acquireVsCodeApi: () => any;
  }
}

interface ScriptTypeItem {
  value: string;
  label: string;
  description: string;
  category: 'normal' | 'object' | 'attribute' | 'other';
}

interface LaunchPointConfig {
  objectname: string;
  attributename: string;
  launchpointname: string;
  description: string;
  eventtype: string;
  objectevent: number;
  attributeevent: string;
  evcontext: string;
  add: boolean;
  update: boolean;
  delete: boolean;
  active: boolean;
  condition: string;
}

const scriptTypes: ScriptTypeItem[] = [
  { value: 'APISCRIPT', label: 'API脚本', description: '通过 REST API 调用', category: 'normal' },
  { value: 'CONDITION', label: '条件脚本', description: '用于条件判断', category: 'normal' },
  { value: 'DATABEAN', label: 'DataBean脚本', description: '数据Bean扩展', category: 'normal' },
  { value: 'CRONTASK', label: '定时任务脚本', description: '定时执行', category: 'normal' },
  { value: 'APPBEAN', label: 'AppBean脚本', description: '应用Bean扩展', category: 'normal' },
  { value: 'OPTION', label: '选项脚本', description: '选项列表', category: 'normal' },
  { value: 'MXERR', label: '异常脚本', description: '异常处理', category: 'normal' },
  { value: 'LOOKUP', label: 'Lookup脚本', description: '查找功能', category: 'normal' },
  { value: 'OBJECT.INIT', label: '对象初始化', description: '在对象创建时触发', category: 'object' },
  { value: 'OBJECT.SAVE', label: '对象保存', description: '在对象保存时触发', category: 'object' },
  { value: 'OBJECT.INITZOMBIE', label: '对象僵尸初始化', description: '僵尸对象初始化', category: 'object' },
  { value: 'FLD_ACTION', label: '字段动作', description: '字段值变更后触发', category: 'attribute' },
  { value: 'FLD_VALIDATE', label: '字段验证', description: '字段值验证', category: 'attribute' },
  { value: 'FLD_LOOKUP', label: '字段查找', description: '字段查找功能', category: 'attribute' },
  { value: 'WF_ACTION', label: '工作流动作', description: '工作流步骤动作', category: 'other' },
  { value: 'RELATIONSHIP', label: '关系脚本', description: '关系验证', category: 'other' }
];

const CreateScriptModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'normal' | 'object'>('normal');
  const [selectedType, setSelectedType] = useState<string>('');
  const [scriptName, setScriptName] = useState('');
  const [description, setDescription] = useState('');
  const [ibmPackagepath, setIbmPackagepath] = useState('');
  const [launchPointConfig, setLaunchPointConfig] = useState<LaunchPointConfig>({
    objectname: '',
    attributename: '',
    launchpointname: '',
    description: '',
    eventtype: '0',
    objectevent: 1,
    attributeevent: '0',
    evcontext: '0',
    add: true,
    update: true,
    delete: false,
    active: true,
    condition: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const vscodeRef = React.useRef<any>(null);

  const getVsCodeApi = () => {
    if (!vscodeRef.current) {
      vscodeRef.current = window.acquireVsCodeApi();
    }
    return vscodeRef.current;
  };

  useEffect(() => {
    getVsCodeApi().postMessage({ command: 'webviewReady' });

    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.command) {
        case 'loadTargetDir':
          _parseTargetDir(message.targetDir, message.workspaceRoot);
          break;
        case 'showError':
          setErrorMessage(message.message);
          setTimeout(() => setErrorMessage(''), 5000);
          break;
        case 'showOverwriteConfirm':
          setShowOverwriteConfirm(true);
          break;
        case 'createSuccess':
          setSuccessMessage(`脚本 ${message.scriptName} 已创建成功！`);
          setIsSubmitting(false);
          break;
      }
    });
  }, []);

  const _parseTargetDir = (targetDir: string, workspaceRoot: string = '') => {
    try {
      const normalizedTargetDir = targetDir.replace(/\\/g, '/');
      let normalizedWorkspaceRoot = workspaceRoot.replace(/\\/g, '/');
      
      if (!normalizedWorkspaceRoot.endsWith('/')) {
        normalizedWorkspaceRoot += '/';
      }
      
      if (normalizedTargetDir.startsWith(normalizedWorkspaceRoot)) {
        const relativePath = normalizedTargetDir.substring(normalizedWorkspaceRoot.length);
        const pathParts = relativePath.split('/').filter(p => p && p !== '.' && !p.includes('.'));
        if (pathParts.length >= 1) {
          const remainingParts = pathParts.slice(1);
          const packagePath = remainingParts.join('.').toLowerCase();
          setIbmPackagepath(packagePath);
        }
      }
    } catch (e) {
      console.error('Error parsing target dir:', e);
    }
  };

  const filteredTypes = scriptTypes.filter(t => {
    if (activeTab === 'normal') {
      return t.category === 'normal' || t.category === 'other';
    }
    return t.category === 'object' || t.category === 'attribute';
  });

  const selectedTypeInfo = scriptTypes.find(t => t.value === selectedType);

  const objectEventTypeOptions = [
    { value: '0', label: '初始化值' },
    { value: '1', label: '验证应用程序' },
    { value: '2', label: '允许创建对象' },
    { value: '3', label: '允许删除对象' },
    { value: '4', label: '保存' }
  ];

  const attributeEventTypeOptions = [
    { value: '1', label: '初始化访问限制' },
    { value: '0', label: '初始化值' },
    { value: '2', label: '验证' },
    { value: '3', label: '检索列表' },
    { value: '4', label: '运行操作' }
  ];

  const evcontextOptions = [
    { value: '0', label: '保存前' },
    { value: '1', label: '保存后' },
    { value: '2', label: '落实后' }
  ];

  const handleSubmit = () => {
    if (!scriptName.trim()) {
      setErrorMessage('脚本名称不能为空');
      return;
    }
    if (!selectedType) {
      setErrorMessage('请选择脚本类型');
      return;
    }

    if (activeTab === 'object') {
      if (!launchPointConfig.objectname.trim()) {
        setErrorMessage('对象名称不能为空');
        return;
      }
      if (selectedTypeInfo?.category === 'attribute' && !launchPointConfig.attributename.trim()) {
        setErrorMessage('字段名称不能为空');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const data: any = {
      scriptName: scriptName.trim(),
      scriptType: selectedType,
      description: description.trim(),
      ibmPackagepath: ibmPackagepath.trim()
    };

    if (activeTab === 'object' && (selectedTypeInfo?.category === 'object' || selectedTypeInfo?.category === 'attribute')) {
      data.launchPointConfig = {
        ...launchPointConfig,
        objectname: launchPointConfig.objectname.trim(),
        attributename: launchPointConfig.attributename.trim(),
        launchpointname: launchPointConfig.launchpointname.trim(),
        description: launchPointConfig.description.trim(),
        condition: launchPointConfig.condition.trim()
      };
    }

    getVsCodeApi().postMessage({
      command: 'createScript',
      data
    });
  };

  const handleOverwriteConfirm = () => {
    setShowOverwriteConfirm(false);
    handleSubmit();
  };

  const handleClose = () => {
    getVsCodeApi().postMessage({ command: 'closePanel' });
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const typeInfo = scriptTypes.find(t => t.value === type);
    
    if (typeInfo?.category === 'normal' || typeInfo?.category === 'other') {
      setScriptName('');
      setDescription(typeInfo.description);
    } else if (typeInfo?.category === 'object') {
      setScriptName('');
      setDescription(typeInfo.description);
      setLaunchPointConfig(prev => ({
        ...prev,
        objectname: '',
        launchpointname: type.replace('OBJECT.', ''),
        description: typeInfo.description,
        eventtype: type === 'OBJECT.SAVE' ? '4' : '0',
        attributeevent: '0',
        condition: '',
        add: type === 'OBJECT.SAVE',
        update: type === 'OBJECT.SAVE',
        delete: type === 'OBJECT.SAVE',
        evcontext: type === 'OBJECT.SAVE' ? '0' : '0'
      }));
    } else if (typeInfo?.category === 'attribute') {
      setScriptName('');
      setDescription(typeInfo.description);
      setLaunchPointConfig(prev => ({
        ...prev,
        objectname: '',
        attributename: '',
        launchpointname: type.replace('FLD_', ''),
        description: typeInfo.description,
        eventtype: '0',
        attributeevent: type === 'FLD_ACTION' ? '4' : type === 'FLD_VALIDATE' ? '2' : type === 'FLD_LOOKUP' ? '3' : '0',
        condition: ''
      }));
    }
  };

  const handleScriptNameChange = (value: string) => {
    const trimmedValue = value.trim();
    setScriptName(trimmedValue);
    if (selectedTypeInfo?.category === 'object' || selectedTypeInfo?.category === 'attribute') {
      const parts = trimmedValue.split('.').filter(p => p.trim());
      if (parts.length >= 1) {
        const updates: any = {};
        updates.objectname = parts[0];
        if (parts.length >= 2) {
          if (selectedTypeInfo.category === 'attribute') {
            updates.attributename = parts[1];
            updates.launchpointname = parts.length >= 3 ? parts[parts.length - 1] : parts[1];
          } else {
            updates.launchpointname = parts.length >= 2 ? parts[parts.length - 1] : '';
          }
        } else {
          updates.launchpointname = '';
        }
        setLaunchPointConfig(prev => ({ ...prev, ...updates }));
      }
    }
  };

  const isSaveEvent = selectedTypeInfo?.category === 'object' && launchPointConfig.eventtype === '4';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--vscode-editor-background)',
      padding: '20px',
      fontFamily: 'var(--vscode-font-family)'
    }}>
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto',
        background: 'var(--vscode-sideBar-background)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: 'var(--vscode-titleBar-activeBackground)',
          borderBottom: '1px solid var(--vscode-panel-border)'
        }}>
          <h2 style={{ 
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--vscode-titleBar-activeForeground)'
          }}>
            创建自动化脚本
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--vscode-titleBar-activeForeground)',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 8px'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '2px solid var(--vscode-panel-border)',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => setActiveTab('normal')}
              style={{
                flex: 1,
                padding: '10px 20px',
                background: activeTab === 'normal' ? 'var(--vscode-button-background)' : 'transparent',
                color: activeTab === 'normal' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                border: 'none',
                borderBottom: activeTab === 'normal' ? '2px solid var(--vscode-textLink-foreground)' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              普通脚本
            </button>
            <button
              onClick={() => setActiveTab('object')}
              style={{
                flex: 1,
                padding: '10px 20px',
                background: activeTab === 'object' ? 'var(--vscode-button-background)' : 'transparent',
                color: activeTab === 'object' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                border: 'none',
                borderBottom: activeTab === 'object' ? '2px solid var(--vscode-textLink-foreground)' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              对象启动点脚本
            </button>
          </div>

          {errorMessage && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              borderRadius: '4px',
              background: 'var(--vscode-inputValidation-errorBackground)',
              color: 'var(--vscode-errorForeground)',
              border: '1px solid var(--vscode-inputValidation-errorBorder)'
            }}>
              ❌ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              borderRadius: '4px',
              background: 'var(--vscode-terminal-ansiGreen)',
              color: 'white'
            }}>
              ✅ {successMessage}
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: '500',
              color: 'var(--vscode-foreground)'
            }}>
              脚本类型 <span style={{ color: 'var(--vscode-errorForeground)' }}>*</span>
            </label>
            <select
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '4px',
                background: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                fontSize: '14px',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            >
              <option value="">请选择脚本类型</option>
              {filteredTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: '500',
              color: 'var(--vscode-foreground)'
            }}>
              脚本名称 <span style={{ color: 'var(--vscode-errorForeground)' }}>*</span>
            </label>
            <input
              type="text"
              value={scriptName}
              onChange={(e) => handleScriptNameChange(e.target.value)}
              placeholder="输入脚本名称，例如: MY_SCRIPT 或 ITEM.INIT"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '4px',
                background: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: '500',
              color: 'var(--vscode-foreground)'
            }}>
              IBM Package Path
            </label>
            <input
              type="text"
              value={ibmPackagepath}
              onChange={(e) => setIbmPackagepath(e.target.value.trim())}
              placeholder="包路径，例如: cn.shoukaiseki.script"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '4px',
                background: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: '500',
              color: 'var(--vscode-foreground)'
            }}>
              描述
            </label>
            <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value.trim())}
                      placeholder="输入脚本描述"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--vscode-input-border)',
                        borderRadius: '4px',
                        background: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
          </div>

          {activeTab === 'object' && selectedTypeInfo && (selectedTypeInfo.category === 'object' || selectedTypeInfo.category === 'attribute') && (
            <div style={{
              background: 'var(--vscode-textBlockQuote-background)',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '15px',
              borderLeft: '4px solid var(--vscode-textLink-foreground)'
            }}>
              <h4 style={{ 
                margin: '0 0 15px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--vscode-foreground)'
              }}>
                启动点配置
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px',
                    fontSize: '13px',
                    color: 'var(--vscode-descriptionForeground)'
                  }}>
                    启动点名称
                  </label>
                  <input
                    type="text"
                    value={launchPointConfig.launchpointname}
                    onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, launchpointname: e.target.value.trim() }))}
                    placeholder="例如: INIT, SAVE"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '4px',
                      background: 'var(--vscode-input-background)',
                      color: 'var(--vscode-input-foreground)',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px',
                    fontSize: '13px',
                    color: 'var(--vscode-descriptionForeground)'
                  }}>
                    对象名称 <span style={{ color: 'var(--vscode-errorForeground)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={launchPointConfig.objectname}
                    onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, objectname: e.target.value.trim() }))}
                    placeholder="例如: ITEM, WORKORDER"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '4px',
                      background: 'var(--vscode-input-background)',
                      color: 'var(--vscode-input-foreground)',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {selectedTypeInfo.category === 'attribute' && (
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '5px',
                      fontSize: '13px',
                      color: 'var(--vscode-descriptionForeground)'
                    }}>
                      字段名称 <span style={{ color: 'var(--vscode-errorForeground)' }}>*</span>
                    </label>
                    <input
                    type="text"
                    value={launchPointConfig.attributename}
                    onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, attributename: e.target.value.trim() }))}
                    placeholder="例如: ITEMNUM, STATUS"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid var(--vscode-input-border)',
                        borderRadius: '4px',
                        background: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px',
                    fontSize: '13px',
                    color: 'var(--vscode-descriptionForeground)'
                  }}>
                    状态
                  </label>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <input
                      type="checkbox"
                      checked={launchPointConfig.active}
                      onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, active: e.target.checked }))}
                      style={{ 
                        width: '16px', 
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--vscode-foreground)' }}>启用</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '15px', padding: '10px', background: 'var(--vscode-editor-background)', borderRadius: '4px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--vscode-foreground)'
                }}>
                  事件类型
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {(selectedTypeInfo.category === 'object' ? objectEventTypeOptions : attributeEventTypeOptions).map(opt => (
                    <label
                      key={opt.value}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '5px 10px',
                        border: `1px solid ${launchPointConfig.eventtype === opt.value ? 'var(--vscode-textLink-foreground)' : 'var(--vscode-input-border)'}`,
                        borderRadius: '4px',
                        background: launchPointConfig.eventtype === opt.value ? 'var(--vscode-textLink-foreground)' : 'transparent',
                        color: launchPointConfig.eventtype === opt.value ? 'white' : 'var(--vscode-foreground)',
                        fontSize: '12px'
                      }}
                    >
                      <input
                        type="radio"
                        name={selectedTypeInfo.category === 'object' ? 'objectEventType' : 'attributeEventType'}
                        value={opt.value}
                        checked={launchPointConfig.eventtype === opt.value}
                        onChange={(e) => {
                          setLaunchPointConfig(prev => ({
                            ...prev,
                            eventtype: e.target.value,
                            attributeevent: e.target.value
                          }));
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {isSaveEvent && (
                <div style={{ marginTop: '15px', padding: '10px', background: 'var(--vscode-editor-background)', borderRadius: '4px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '10px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--vscode-foreground)'
                  }}>
                    保存操作
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={launchPointConfig.add}
                        onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, add: e.target.checked }))}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>添加</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={launchPointConfig.update}
                        onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, update: e.target.checked }))}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>更新</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={launchPointConfig.delete}
                        onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, delete: e.target.checked }))}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>删除</span>
                    </label>
                  </div>

                  <label style={{ 
                    display: 'block', 
                    marginBottom: '10px',
                    marginTop: '15px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--vscode-foreground)'
                  }}>
                    事件上下文
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {evcontextOptions.map(opt => (
                      <label
                        key={opt.value}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          padding: '5px 10px',
                          border: `1px solid ${launchPointConfig.evcontext === opt.value ? 'var(--vscode-textLink-foreground)' : 'var(--vscode-input-border)'}`,
                          borderRadius: '4px',
                          background: launchPointConfig.evcontext === opt.value ? 'var(--vscode-textLink-foreground)' : 'transparent',
                          color: launchPointConfig.evcontext === opt.value ? 'white' : 'var(--vscode-foreground)',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="radio"
                          name="evcontext"
                          value={opt.value}
                          checked={launchPointConfig.evcontext === opt.value}
                          onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, evcontext: e.target.value }))}
                          style={{ cursor: 'pointer' }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px',
                  fontSize: '13px',
                  color: 'var(--vscode-descriptionForeground)'
                }}>
                  启动点描述
                </label>
                <input
                  type="text"
                  value={launchPointConfig.description}
                  onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, description: e.target.value.trim() }))}
                  placeholder="输入启动点描述"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: '1px solid var(--vscode-input-border)',
                    borderRadius: '4px',
                    background: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {selectedTypeInfo.category === 'object' && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px',
                    fontSize: '13px',
                    color: 'var(--vscode-descriptionForeground)'
                  }}>
                    条件表达式
                  </label>
                  <textarea
                    value={launchPointConfig.condition}
                    onChange={(e) => setLaunchPointConfig(prev => ({ ...prev, condition: e.target.value.trim() }))}
                    placeholder="输入条件表达式（可选）"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '4px',
                      background: 'var(--vscode-input-background)',
                      color: 'var(--vscode-input-foreground)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            gap: '10px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleClose}
              style={{
                padding: '8px 20px',
                background: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                background: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      </div>

      {showOverwriteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--vscode-sideBar-background)',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ 
              margin: '0 0 10px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--vscode-foreground)'
            }}>
              文件已存在
            </h3>
            <p style={{ 
              margin: '0 0 15px 0',
              color: 'var(--vscode-descriptionForeground)'
            }}>
              文件已存在，是否覆盖？
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowOverwriteConfirm(false)}
                style={{
                  padding: '6px 16px',
                  background: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                取消
              </button>
              <button
                onClick={handleOverwriteConfirm}
                style={{
                  padding: '6px 16px',
                  background: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                覆盖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateScriptModal;