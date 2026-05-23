import React, { useState, useEffect } from 'react';

interface LoggerConfig {
  loggerName: string;
  level: string;
  ignore?: boolean;
}

interface LogLevelConfigProps {
  vscode: any;
}

const LogLevelConfig: React.FC<LogLevelConfigProps> = ({ vscode }) => {
  const [loggers, setLoggers] = useState<LoggerConfig[]>([]);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 日志级别选项
  const levelOptions = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    setLoading(true);
    vscode.postMessage({ command: 'loadLoggerConfig' });
  };

  // 监听来自后端的消息
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'loggerConfigLoaded':
          setLoggers(message.config || []);
          setLoading(false);
          break;
        case 'loggerConfigSaved':
          if (message.success) {
            showMessage('success', '配置已保存到本地');
          } else {
            showMessage('error', message.error || '保存失败');
          }
          break;
        case 'loggerQueryResult':
          // 更新指定日志器的级别
          const updatedLoggers = loggers.map(logger => {
            const found = message.result?.find((r: any) => r.loggerName === logger.loggerName);
            return found ? { ...logger, level: found.level } : logger;
          });
          setLoggers(updatedLoggers);
          setLoading(false);
          break;
        case 'loggerUpdateResult':
          if (message.success) {
            showMessage('success', message.message || '日志级别更新成功');
          } else {
            showMessage('error', message.message || '更新失败');
          }
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loggers]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 添加新行
  const addRow = () => {
    setLoggers([...loggers, { loggerName: '', level: 'INFO', ignore: false }]);
  };

  // 删除行
  const deleteRow = (index: number) => {
    setLoggers(loggers.filter((_, i) => i !== index));
  };

  // 更新行数据
  const updateRow = (index: number, field: keyof LoggerConfig, value: any) => {
    const newLoggers = [...loggers];
    newLoggers[index] = { ...newLoggers[index], [field]: value };
    setLoggers(newLoggers);
  };

  // 重新加载单个日志器
  const reloadLogger = (index: number) => {
    const logger = loggers[index];
    if (!logger.loggerName) {
      showMessage('error', '请先输入日志名称');
      return;
    }
    setLoading(true);
    vscode.postMessage({
      command: 'queryLoggerLevel',
      loggers: [{ loggerName: logger.loggerName }]
    });
  };

  // 更新到 Maximo
  const updateToMaximo = () => {
    const validLoggers = loggers.filter(l => l.loggerName.trim() !== '');
    if (validLoggers.length === 0) {
      showMessage('error', '请至少配置一个日志器');
      return;
    }

    setLoading(true);
    vscode.postMessage({
      command: 'updateLoggerLevel',
      loggers: validLoggers.map(({ loggerName, level }) => ({ loggerName, level }))
    });
  };

  // 保存到本地
  const saveToLocal = () => {
    vscode.postMessage({
      command: 'saveLoggerConfig',
      config: loggers
    });
    showMessage('success', '配置已保存到本地');
  };

  // 切换到 JSON 模式
  const toggleJsonMode = () => {
    if (!jsonMode) {
      // 进入 JSON 模式，格式化当前数据
      setJsonText(JSON.stringify(loggers, null, 2));
    } else {
      // 退出 JSON 模式，解析 JSON
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          setLoggers(parsed);
        } else {
          showMessage('error', 'JSON 格式错误：必须是数组');
          return;
        }
      } catch (e) {
        showMessage('error', 'JSON 解析失败');
        return;
      }
    }
    setJsonMode(!jsonMode);
  };

  return (
    <div className="log-level-config">
      {/* 提示信息 */}
      <div className="info-banner">
        ⚠️ 当前设置仅临时有效，重启 Maximo 后会恢复。不会更新 MAXLOGGER 表的信息。
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 工具栏 */}
      <div className="toolbar">
        <button onClick={updateToMaximo} className="btn btn-primary" disabled={loading}>
          🚀 更新到 Maximo
        </button>
        <button onClick={saveToLocal} className="btn btn-success" disabled={loading}>
          💾 保存到本地
        </button>
        <button onClick={toggleJsonMode} className="btn btn-secondary">
          {jsonMode ? '📋 表格模式' : '📝 JSON 模式'}
        </button>
        <button onClick={addRow} className="btn btn-secondary">
          ➕ 添加行
        </button>
      </div>

      {/* 内容区域 */}
      {jsonMode ? (
        <textarea
          className="json-editor"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={20}
        />
      ) : (
        <div className="table-container">
          <table className="config-table">
            <thead>
              <tr>
                <th>日志名称</th>
                <th>日志级别</th>
                <th>忽略</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loggers.map((logger, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={logger.loggerName}
                      onChange={(e) => updateRow(index, 'loggerName', e.target.value)}
                      placeholder="例如: maximo.script"
                      className="table-input"
                    />
                  </td>
                  <td>
                    <select
                      value={logger.level}
                      onChange={(e) => updateRow(index, 'level', e.target.value)}
                      className="table-select"
                    >
                      {levelOptions.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={logger.ignore || false}
                      onChange={(e) => updateRow(index, 'ignore', e.target.checked)}
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => reloadLogger(index)}
                      className="btn btn-small"
                      title="重新加载此日志器的级别"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => deleteRow(index)}
                      className="btn btn-small btn-danger"
                      title="删除此行"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {/* 空行用于快速添加 */}
              <tr>
                <td colSpan={4} className="empty-row" onClick={addRow}>
                  + 点击添加新行
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LogLevelConfig;
