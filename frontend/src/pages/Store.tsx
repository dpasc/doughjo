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
  _id: string;
  name: string;
  price: number;
  seconds_for_order: number;
}

const { Title } = Typography;

const columnsBase = [
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

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete confirmation state
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

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

  // Edit handlers
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
    form.setFieldsValue({
      name: product.name,
      price: product.price,
      seconds_for_order: product.seconds_for_order,
    });
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setEditingProduct(null);
    form.resetFields();
  };

  // Delete handlers
  const handleDelete = (product: Product) => {
    setDeletingProduct(product);
  };

  const handleDeleteCancel = () => {
    setDeletingProduct(null);
  };

  // Columns with actions
  const columns = [
    ...columnsBase,
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Product) => (
        <>
          <Button
            type="link"
            onClick={() => handleEdit(record)}
            style={{ marginRight: 8 }}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDelete(record)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

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
          rowKey="_id"
          pagination={false}
          style={{ marginTop: 24 }}
        />
      </Spin>
      {/* Add Product Modal */}
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
      {/* Edit Product Modal */}
      <Modal
        title="Edit Product"
        open={isEditModalOpen}
        onCancel={handleEditCancel}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            setFormLoading(true);
            if (!editingProduct) throw new Error("No product selected");
            const res = await fetch(`/store/${editingProduct._id}`, {
              method: "PUT",
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
              throw new Error(data.error || "Failed to update product");
            }
            message.success("Product updated!");
            setIsEditModalOpen(false);
            setEditingProduct(null);
            fetchProducts();
          } catch (err: any) {
            message.error(err.message || "Failed to update product");
          } finally {
            setFormLoading(false);
            form.resetFields();
          }
        }}
        confirmLoading={formLoading}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          name="edit_product_form"
          initialValues={{
            name: editingProduct?.name,
            price: editingProduct?.price,
            seconds_for_order: editingProduct?.seconds_for_order,
          }}
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
      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Product"
        open={!!deletingProduct}
        onCancel={handleDeleteCancel}
        onOk={async () => {
          if (!deletingProduct) return;
          try {
            setFormLoading(true);
            const res = await fetch(`/store/${deletingProduct._id}`, {
              method: "DELETE",
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to delete product");
            }
            message.success("Product deleted!");
            setDeletingProduct(null);
            fetchProducts();
          } catch (err: any) {
            message.error(err.message || "Failed to delete product");
          } finally {
            setFormLoading(false);
          }
        }}
        confirmLoading={formLoading}
        okText="Delete"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
        destroyOnClose
      >
        <p>
          Are you sure you want to delete{" "}
          <b>{deletingProduct?.name}</b>?
        </p>
      </Modal>
    </div>
  );
};

export default Store;
