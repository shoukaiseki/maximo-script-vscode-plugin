import React, { useState, useEffect } from 'react';
import LogViewer from './LogViewer';
import LogLevelConfig from './LogLevelConfig';

interface LogManagerProps {
  vscode: any;
}

const LogManager: React.FC<LogManagerProps> = ({ vscode }) => {
  const [activeTab, setActiveTab] = useState<'query' | 'config'>('query');

  return (
    <div className="log-manager">
      {/* 标签页导航 */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'query' ? 'active' : ''}`}
          onClick={() => setActiveTab('query')}
        >
          🔍 日志级别查询
        </button>
        <button
          className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ 日志级别配置
        </button>
      </div>

      {/* 标签页内容 */}
      <div className="tab-content">
        {activeTab === 'query' && <LogViewer vscode={vscode} />}
        {activeTab === 'config' && <LogLevelConfig vscode={vscode} />}
      </div>
    </div>
  );
};

export default LogManager;
