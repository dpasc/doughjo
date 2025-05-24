import React from "react";
import { Layout, Menu, Typography } from "antd";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Shift from "./pages/Shift";
import Stats from "./pages/Stats";
import Store from "./pages/Store";
import Settings from "./pages/Settings";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const navItems = [
  {
    key: "/shift",
    label: "Shift",
    icon: <span role="img" aria-label="Shift">🍩</span>,
  },
  {
    key: "/stats",
    label: "Stats",
    icon: <span role="img" aria-label="Stats">📊</span>,
  },
  {
    key: "/store",
    label: "Store",
    icon: <span role="img" aria-label="Store">🛒</span>,
  },
  {
    key: "/settings",
    label: "Settings",
    icon: <span role="img" aria-label="Settings">⚙️</span>,
  },
];

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={200} style={{ background: "#fff" }}>
        <div style={{ height: 32, margin: 16, textAlign: "center", fontWeight: "bold" }}>
          Doughjo
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ height: "100%", borderRight: 0 }}
          onClick={({ key }) => navigate(key)}
          items={navItems}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#001529", padding: "0 24px" }}>
          <Title style={{ color: "#fff", margin: 0 }} level={2}>
            Doughjo Dashboard
          </Title>
        </Header>
        <Content style={{ margin: "24px 16px 0", padding: 24, background: "#fff" }}>
          <Routes>
            <Route path="/shift" element={<Shift />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/store" element={<Store />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Shift />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => (
  <Router>
    <AppLayout />
  </Router>
);

export default App;
