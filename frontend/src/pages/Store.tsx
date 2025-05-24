import React, { useEffect, useState } from "react";
import {
  Table,
  Typography,
  Spin,
  Alert,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
} from "antd";

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

  // Modal and form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchProducts = () => {
    setLoading(true);
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
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, []);

  const handleAddItem = () => {
    setIsModalOpen(true);
    form.resetFields();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setFormLoading(true);
      const res = await fetch("/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          price: values.price,
          seconds_for_order: values.seconds_for_order,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add product");
      }
      message.success("Product added!");
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      message.error(err.message || "Failed to add product");
    } finally {
      setFormLoading(false);
      form.resetFields();
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Store Page</Title>
      <p>Welcome to the Store page! 🛒</p>
      <Button type="primary" onClick={handleAddItem} style={{ marginBottom: 16 }}>
        Add Item
      </Button>
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
      <Modal
        title="Add New Product"
        open={isModalOpen}
        onCancel={handleCancel}
        onOk={handleSave}
        confirmLoading={formLoading}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          name="add_product_form"
          initialValues={{ name: "", price: null, seconds_for_order: null }}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter the product name" }]}
          >
            <Input placeholder="Product name" />
          </Form.Item>
          <Form.Item
            label="Price"
            name="price"
            rules={[
              { required: true, message: "Please enter the price" },
              { type: "number", min: 0, message: "Price must be non-negative" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={0.01}
              placeholder="Price"
              prefix="$"
            />
          </Form.Item>
          <Form.Item
            label="Seconds to Complete Order"
            name="seconds_for_order"
            rules={[
              { required: true, message: "Please enter the seconds to complete order" },
              { type: "number", min: 0, message: "Must be non-negative" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={1}
              placeholder="Seconds"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Store;
