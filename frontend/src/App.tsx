import React, { useEffect, useState } from 'react';
import { Table, Button, Layout, Typography, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface Item {
  name: string;
  value: number;
}

const { Header, Content } = Layout;
const { Title } = Typography;

const columns: ColumnsType<Item> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Value', dataIndex: 'value', key: 'value' },
];

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch('/items')
      .then((res) => res.json())
      .then((data: Item[]) => setItems(data))
      .catch((err) => {
        console.error(err);
        message.error('Failed to load items');
      });
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <Title style={{ color: '#fff', margin: 0 }} level={2}>
          Doughjo Dashboard
        </Title>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Button
            type="primary"
            onClick={() => message.info('This is an Ant Design button!')}
          >
            Click Me
          </Button>

          <Table<Item>
            dataSource={items}
            columns={columns}
            rowKey={(record) => record.name}
            pagination={false}
            locale={{ emptyText: 'No items found' }}
          />
        </Space>
      </Content>
    </Layout>
  );
};

export default App;
