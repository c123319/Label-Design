import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '8px 16px', borderBottom: '1px solid #e8e8e8' }}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Label Design - 标签设计工具</h1>
        </header>
        <main style={{ flex: 1, display: 'flex' }}>
          {/* Toolbar */}
          <aside style={{ width: 60, borderRight: '1px solid #e8e8e8' }} />
          {/* Canvas */}
          <section style={{ flex: 1 }} />
          {/* Property Panel */}
          <aside style={{ width: 280, borderLeft: '1px solid #e8e8e8' }} />
        </main>
      </div>
    </ConfigProvider>
  );
}

export default App;
