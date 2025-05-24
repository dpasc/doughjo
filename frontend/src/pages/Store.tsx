import React, { useEffect, useState } from "react";
import { Table, Typography, Spin, Alert } from "antd";

interface Product {
  name: string;
  price: number;
  seconds_for_order: number;
}

const { Title } = Typography;

const columns = [
  {
    title: "Product Name",
    dataIndex: "name",
    key: "name",
  },
  {
    title: "Price",
    dataIndex: "price",
    key: "price",
    render: (price: number) => `$${price.toFixed(2)}`,
  },
  {
    title: "Seconds for Order",
    dataIndex: "seconds_for_order",
    key: "seconds_for_order",
  },
];

const Store: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/store")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Store Page</Title>
      <p>Welcome to the Store page! 🛒</p>
      {error && <Alert type="error" message={error} />}
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={products}
          rowKey="name"
          pagination={false}
          style={{ marginTop: 24 }}
        />
      </Spin>
    </div>
  );
};

export default Store;
