import React, { useState, useEffect } from 'react';

interface LoggerInfo {
  loggerName: string;
  level: string;
}

interface LogViewerProps {
  vscode: any;
}

const LogViewer: React.FC<LogViewerProps> = ({ vscode }) => {
  const [loggers, setLoggers] = useState<LoggerInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingLevels, setChangingLevels] = useState<{[key: string]: string}>({});

  // 查询所有日志级别
  const queryAllLoggers = () => {
    setLoading(true);
    setMessage(null);
    vscode.postMessage({
      command: 'queryLoggerLevel',
      loggers: [] // 空数组表示查询所有
    });
  };

  // 监听来自后端的消息
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'loggerQueryResult') {
        if (message.result) {
          // 判断是查询所有还是查询单个
          // 如果返回的记录数 >= 当前列表数，说明是查询所有，替换整个列表
          // 否则是查询单个，只更新对应的项
          if (message.result.length >= loggers.length && loggers.length > 0) {
            // 查询所有，替换整个列表
            setLoggers(message.result);
          } else if (loggers.length === 0) {
            // 首次查询，直接设置
            setLoggers(message.result);
          } else {
            // 查询单个，更新对应的项
            setLoggers(prev => {
              const updated = [...prev];
              message.result.forEach((newItem: any) => {
                const index = updated.findIndex(item => item.loggerName === newItem.loggerName);
                if (index !== -1) {
                  updated[index] = newItem;
                } else {
                  updated.push(newItem);
                }
              });
              return updated;
            });
          }
          setLoading(false);
          showMessage('success', `查询成功，共 ${message.result.length} 条记录`);
        } else if (message.error) {
          setLoading(false);
          showMessage('error', message.error);
        }
      } else if (message.command === 'loggerUpdateResult') {
        // 更新成功，显示提示，但不关闭 loading（等待重新查询完成）
        if (message.success) {
          showMessage('success', message.message || '日志级别更新成功');
        } else {
          setLoading(false);
          showMessage('error', message.message || '更新失败');
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loggers.length]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 更新单个日志器的级别
  const updateLoggerLevel = (loggerName: string, newLevel: string) => {
    setLoading(true);
    vscode.postMessage({
      command: 'updateLoggerLevel',
      loggers: [{ loggerName, level: newLevel }]
    });
    
    // 更新成功后，重新查询该日志器以获取最新状态
    setTimeout(() => {
      vscode.postMessage({
        command: 'queryLoggerLevel',
        loggers: [{ loggerName }]
      });
    }, 500);
  };

  // 重新加载单个日志器
  const reloadLogger = (loggerName: string) => {
    setLoading(true);
    vscode.postMessage({
      command: 'queryLoggerLevel',
      loggers: [{ loggerName }]
    });
  };

  // 处理更改级别
  const handleLevelChange = (loggerName: string, newLevel: string) => {
    setChangingLevels(prev => ({ ...prev, [loggerName]: newLevel }));
    // 直接调用接口更新
    updateLoggerLevel(loggerName, newLevel);
  };

  // 过滤日志器
  const filteredLoggers = loggers.filter(logger =>
    logger.loggerName.toLowerCase().includes(filter.toLowerCase()) ||
    logger.level.toLowerCase().includes(filter.toLowerCase())
  );

  // 获取日志级别颜色
  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return '#f44336';
      case 'WARN': return '#ff9800';
      case 'INFO': return '#2196f3';
      case 'DEBUG': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  return (
    <div className="log-viewer">
      {/* 消息提示 */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 工具栏 */}
      <div className="toolbar">
        <button onClick={queryAllLoggers} className="btn btn-primary" disabled={loading}>
          🔍 查询所有日志级别
        </button>
        <input
          type="text"
          placeholder="🔎 搜索日志器名称或级别..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
      </div>

      {/* 日志器列表 */}
      <div className="log-list">
        {loading ? (
          <div className="empty-state">
            <p>⏳ 查询中...</p>
          </div>
        ) : filteredLoggers.length === 0 ? (
          <div className="empty-state">
            <p>暂无数据，点击“查询所有日志级别”按钮开始查询</p>
          </div>
        ) : (
          <table className="config-table">
            <thead>
              <tr>
                <th>日志器名称</th>
                <th>日志级别</th>
                <th>更改日志级别</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoggers.map((logger, index) => (
                <tr key={index}>
                  <td>{logger.loggerName}</td>
                  <td>
                    <span
                      className="log-level-badge"
                      style={{ 
                        backgroundColor: getLevelColor(logger.level),
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        minWidth: '80px',
                        textAlign: 'center'
                      }}
                    >
                      {logger.level}
                    </span>
                  </td>
                  <td>
                    <select
                      value={changingLevels[logger.loggerName] || logger.level}
                      onChange={(e) => handleLevelChange(logger.loggerName, e.target.value)}
                      className="table-select"
                      disabled={loading}
                    >
                      <option value="DEBUG">DEBUG</option>
                      <option value="INFO">INFO</option>
                      <option value="WARN">WARN</option>
                      <option value="ERROR">ERROR</option>
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => reloadLogger(logger.loggerName)}
                      className="btn btn-small"
                      title="重新加载此日志器的级别"
                      disabled={loading}
                    >
                      🔄
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
