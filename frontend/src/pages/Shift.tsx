import React, { useState, useEffect, useRef } from "react";
import {
  InputNumber,
  Button,
  List,
  Typography,
  Card,
  Space,
  Alert,
  Row,
  Col,
  Spin,
  Segmented,
} from "antd";

type OrderItem = {
  name: string;
  seconds_for_order: number;
  price: number;
};

type Order = {
  id: number;
  timestamp: number;
  items: OrderItem[];
  totalSeconds: number;
};

type ShiftHistory = {
  shiftDuration: number;
  orders: Order[];
  startTime: number;
  endTime: number;
};

enum ShiftStatus {
  NotStarted,
  Active,
  Ended,
}

const getRandomDelay = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const Shift: React.FC = () => {
  // Shift state
  const [shiftDuration, setShiftDuration] = useState<number>(1); // minutes
  const [inputValue, setInputValue] = useState<string>("1");
  const [status, setStatus] = useState<ShiftStatus>(ShiftStatus.NotStarted);
  const [timeLeft, setTimeLeft] = useState<number>(60); // seconds
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderId, setOrderId] = useState<number>(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const orderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store items state
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [loadingStore, setLoadingStore] = useState<boolean>(false);

  // Completed orders state
  const [completedOrders, setCompletedOrders] = useState<
    { id: number; created: number; completed: number; items: OrderItem[] }[]
  >([]);

  // Toggle state for order view
  const [orderView, setOrderView] = useState<"current" | "completed">("current");

  // Shift history state
  const [shiftHistory, setShiftHistory] = useState<ShiftHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Fetch last 3 shifts when in NotStarted state
  useEffect(() => {
    if (status !== ShiftStatus.NotStarted) return;
    setLoadingHistory(true);
    fetch("/shift/history")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.shifts)) {
          // Get last 3 shifts, most recent first
          setShiftHistory(
            data.shifts.slice(-3).reverse()
          );
        } else {
          setShiftHistory([]);
        }
      })
      .catch(() => setShiftHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [status]);

  // Start shift
  const handleStartShift = () => {
    const durationMinutes = parseInt(inputValue, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) return;
    const durationSeconds = durationMinutes * 60;
    setShiftDuration(durationMinutes);
    setTimeLeft(durationSeconds);
    setOrders([]);
    setOrderId(1);
    setStartTime(Date.now());
    setEndTime(null);
    setSaveResult(null);
    setCompletedOrders([]);
    setStatus(ShiftStatus.Active);
  };

  // End shift (early or on timer)
  const handleEndShift = () => {
    setEndTime(Date.now());
    setStatus(ShiftStatus.Ended);
  };

  // Fetch store items when shift becomes active
  useEffect(() => {
    if (status !== ShiftStatus.Active) return;
    setLoadingStore(true);
    fetch("/store")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStoreItems(data);
        } else {
          setStoreItems([]);
        }
      })
      .catch(() => setStoreItems([]))
      .finally(() => setLoadingStore(false));
  }, [status]);

  // Countdown timer effect
  useEffect(() => {
    if (status !== ShiftStatus.Active) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setEndTime(Date.now());
          setStatus(ShiftStatus.Ended);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Simulate orders at random intervals
  useEffect(() => {
    if (status !== ShiftStatus.Active) return;
    const addOrder = () => {
      // Randomly select 1-3 unique items from storeItems
      if (storeItems.length === 0) return;
      const numItems = getRandomDelay(1, Math.min(3, storeItems.length));
      const shuffled = [...storeItems].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, numItems).map((item: any) => ({
        name: item.name,
        seconds_for_order: item.seconds_for_order,
        price: item.price,
      }));
      const totalSeconds = selected.reduce(
        (sum, item) => sum + (item.seconds_for_order || 0),
        0
      );
      setOrders((prev) => [
        ...prev,
        {
          id: orderId,
          timestamp: Date.now(),
          items: selected,
          totalSeconds,
        },
      ]);
      setOrderId((id) => id + 1);
      // Schedule next order
      const delay = getRandomDelay(3, 10) * 1000; // 3-10 seconds
      orderTimeoutRef.current = setTimeout(addOrder, delay);
    };
    // Start first order after a short delay
    const initialDelay = getRandomDelay(2, 5) * 1000;
    orderTimeoutRef.current = setTimeout(addOrder, initialDelay);

    return () => {
      if (orderTimeoutRef.current) clearTimeout(orderTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, orderId]);

  // Cleanup on shift end and send data to backend
  useEffect(() => {
    if (status === ShiftStatus.Ended) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (orderTimeoutRef.current) clearTimeout(orderTimeoutRef.current);

      // Only send if we have start and end times
      if (startTime && endTime) {
        const payload = {
          shiftDuration: shiftDuration * 60, // send as seconds
          orders,
          startTime,
          endTime,
        };
        setSaveResult("Saving shift...");
        fetch("/shift/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
          .then(async (res) => {
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Failed to save shift");
            }
            return res.json();
          })
          .then(() => {
            setSaveResult("Shift saved successfully!");
          })
          .catch((err) => {
            setSaveResult("Error saving shift: " + err.message);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, startTime, endTime]);

  // Reset to initial state after shift ends or return to main
  const handleReset = () => {
    setStatus(ShiftStatus.NotStarted);
    setInputValue("1");
    setShiftDuration(1);
    setTimeLeft(60);
    setOrders([]);
    setOrderId(1);
    setStartTime(null);
    setEndTime(null);
    setSaveResult(null);
    setCompletedOrders([]);
  };

  // Complete order handler
  const handleCompleteOrder = (orderId: number) => {
    // Prevent duplicate completion
    if (completedOrders.some((o) => o.id === orderId)) return;
    // Find the order to complete from the current orders state
    const orderToComplete = orders.find((o) => o.id === orderId);
    if (!orderToComplete) return;
    // Add to completedOrders
    setCompletedOrders((prevCompleted) => [
      ...prevCompleted,
      {
        id: orderToComplete.id,
        created: orderToComplete.timestamp,
        completed: Date.now(),
        items: orderToComplete.items,
      },
    ]);
    // Remove from orders
    setOrders((prevOrders) => prevOrders.filter((o) => o.id !== orderId));
  };

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // --- UI ---

  // Shift history cards (top row)
  const renderShiftHistory = () => (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      {loadingHistory ? (
        <Col span={24} style={{ textAlign: "center" }}>
          <Spin />
        </Col>
      ) : shiftHistory.length === 0 ? (
        <Col span={24} style={{ textAlign: "center" }}>
          <Typography.Text type="secondary">No previous shifts.</Typography.Text>
        </Col>
      ) : (
        shiftHistory.map((shift, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card
              title={`Shift #${shiftHistory.length - idx}`}
              style={{ minHeight: 280, display: "flex", flexDirection: "column" }}
              bodyStyle={{ display: "flex", flexDirection: "column", height: 220, padding: 12 }}
            >
              <Typography.Text>
                Duration: {Math.round(shift.shiftDuration / 60)} min
              </Typography.Text>
              <br />
              <Typography.Text>
                Orders: {shift.orders.length}
              </Typography.Text>
              <br />
              <Typography.Text>
                Start: {new Date(shift.startTime).toLocaleString()}
              </Typography.Text>
              <br />
              <Typography.Text>
                End: {new Date(shift.endTime).toLocaleString()}
              </Typography.Text>
              <div
                style={{
                  flex: 1,
                  marginTop: 8,
                  overflowY: "auto",
                  border: "1px solid #f0f0f0",
                  borderRadius: 4,
                  padding: 4,
                  background: "#fafafa",
                }}
              >
                <Typography.Text strong>Orders:</Typography.Text>
                {shift.orders.length === 0 ? (
                  <Typography.Text type="secondary"> None</Typography.Text>
                ) : (
                  <List
                    size="small"
                    dataSource={shift.orders}
                    renderItem={(order) => (
                      <List.Item>
                        #{order.id} - {new Date(order.timestamp).toLocaleTimeString()}
                      </List.Item>
                    )}
                    style={{ maxHeight: 60, overflowY: "auto" }}
                  />
                )}
              </div>
            </Card>
          </Col>
        ))
      )}
    </Row>
  );

  // Start shift card (second row)
  const renderStartShift = () => (
    <Row justify="start">
      <Col xs={24} sm={18} md={12}>
        <Card>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Title level={3}>Start a Shift</Typography.Title>
            <Typography.Text>Shift Duration (minutes):</Typography.Text>
            <InputNumber
              min={1}
              value={Number(inputValue)}
              onChange={(value) => setInputValue(String(value))}
              style={{ width: 120 }}
            />
            <Button type="primary" onClick={handleStartShift}>
              Start Shift
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );

  // OrderCard component for per-order display (custom visuals)
  const OrderCard: React.FC<{
    order: Order;
    onComplete: (orderId: number) => void;
  }> = ({ order, onComplete }) => {
    const [secondsOnScreen, setSecondsOnScreen] = useState<number>(
      Math.floor((Date.now() - order.timestamp) / 1000)
    );
    const [isCompleting, setIsCompleting] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      timerRef.current = setInterval(() => {
        setSecondsOnScreen(Math.floor((Date.now() - order.timestamp) / 1000));
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [order.timestamp]);

    // Card-level timer color logic
    const getTimerColor = (elapsed: number) => {
      if (elapsed < 300) return "#1DB954"; // green
      if (elapsed < 600) return "#FF8C00"; // orange
      return "#D40000"; // red
    };

    // Per-item row background color logic
    const getItemBg = (avgPrep: number, elapsed: number) => {
      const remaining = avgPrep - elapsed;
      if (remaining <= 45) return "#D40000";
      if (remaining <= 90) return "#FF8C00";
      return "#fff";
    };

    // Placeholder for modifiers (since not in backend)
    const getModifiers = (item: any) => {
      // Example: return item.modifiers || [];
      return []; // No modifiers in current data model
    };

    // Format mm:ss for timer
    const formatTimer = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
      <div
        style={{
          width: 360,
          height: 500,
          background: "#FAFAFA",
          border: "6px solid #001F54",
          borderRadius: 0,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
          padding: 0,
          margin: "0 auto"
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            height: 60,
            background: "#001F54",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 34.7,
              letterSpacing: 1,
              textAlign: "center",
              width: "100%",
              userSelect: "none",
              fontFamily: "inherit"
            }}
          >
            {`Order #${order.id}`}
          </span>
        </div>
        {/* Card-level Timer */}
        <div
          style={{
            height: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "monospace",
            fontSize: 37.3,
            color: getTimerColor(secondsOnScreen),
            borderBottom: "1px solid #eee",
            fontWeight: 700,
            letterSpacing: 1,
            background: "transparent"
          }}
        >
          {formatTimer(secondsOnScreen)}
        </div>
        {/* Item List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 16px 0 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {order.items.map((item, idx) => {
            // Per-item timer logic
            const elapsed = secondsOnScreen;
            const avgPrep = item.seconds_for_order;
            const remaining = avgPrep - elapsed;
            // Placeholder: quantity always 1
            const quantity = 1;
            const modifiers = getModifiers(item);

            return (
              <div
                key={idx}
                style={{
                  marginBottom: idx < order.items.length - 1 ? 12 : 0,
                  background: getItemBg(avgPrep, elapsed),
                  borderRadius: 6,
                  padding: "8px 12px",
                  transition: "background 0.3s",
                  display: "flex",
                  alignItems: "center",
                  minHeight: 32,
                }}
              >
                <span style={{ fontWeight: "bold", fontSize: 21.3, marginRight: 8 }}>
                  {quantity}×
                </span>
                <span style={{ fontSize: 21.3, color: "#111" }}>{item.name}</span>
                {/* Optionally, show remaining time for debug:
                <span style={{ marginLeft: "auto", fontSize: 14, color: "#888" }}>
                  {remaining}s
                </span>
                */}
                {modifiers.length > 0 && (
                  <div
                    style={{
                      fontStyle: "italic",
                      color: "#D40000",
                      fontSize: 14,
                      marginLeft: 24,
                      marginTop: 2,
                    }}
                  >
                    {modifiers.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Drag Handle (down-chevron) */}
        <div
          style={{
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "auto",
            marginBottom: 8,
            userSelect: "none",
          }}
        >
          <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
            <path
              d="M4 6l8 8 8-8"
              stroke="#888"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* Complete Order Button */}
        <div style={{ padding: "0 16px 16px 16px" }}>
          <Button
            type="primary"
            danger
            style={{ width: "100%", fontWeight: "bold", fontSize: 16, marginTop: 0 }}
            onClick={() => {
              setIsCompleting(true);
              onComplete(order.id);
            }}
            disabled={isCompleting}
          >
            {isCompleting ? "Completing..." : "Complete Order"}
          </Button>
        </div>
      </div>
    );
  };

  // Simple card for completed orders
  const CompletedOrderCard: React.FC<{
    order: { id: number; created: number; completed: number; items: OrderItem[] };
  }> = ({ order }) => (
    <div
      style={{
        width: 360,
        minHeight: 220,
        background: "#F5F5F5",
        border: "3px solid #1DB954",
        borderRadius: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
        padding: 0,
        margin: "0 auto"
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          height: 48,
          background: "#1DB954",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontWeight: "bold",
            fontSize: 28,
            letterSpacing: 1,
            textAlign: "center",
            width: "100%",
            userSelect: "none",
            fontFamily: "inherit"
          }}
        >
          {`Order #${order.id}`}
        </span>
      </div>
      <div style={{ padding: "16px 16px 0 16px", flex: 1 }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>
          Completed: {new Date(order.completed).toLocaleTimeString()}
        </div>
        <div style={{ fontWeight: 400, marginBottom: 6 }}>
          Time Taken: {((order.completed - order.created) / 1000).toFixed(1)}s
        </div>
        <div>
          <b>Items:</b>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {order.items.map((item, idx) => (
              <li key={idx} style={{ fontSize: 17 }}>{item.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  // Shift in progress
  const renderActiveShift = () => (
    <div style={{ width: "100%", overflowX: "hidden" }}>
      <div style={{ width: "100%", marginBottom: 24 }}>
        <Typography.Title level={3}>Shift in Progress</Typography.Title>
        <Row align="middle" justify="center" style={{ width: "100%", marginBottom: 8 }}>
          <Col flex="1 1 0" />
          <Col flex="0 1 auto">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Typography.Title level={4} style={{ margin: 0, textAlign: "center" }}>
                Orders
              </Typography.Title>
              <Segmented
                options={[
                  { label: "Current Orders", value: "current" },
                  { label: "Completed Orders", value: "completed" },
                ]}
                value={orderView}
                onChange={val => setOrderView(val as "current" | "completed")}
                style={{ marginTop: 4, marginBottom: 0, minWidth: 220, justifyContent: "center" }}
              />
            </div>
          </Col>
          <Col flex="1 1 0" style={{ display: "flex", justifyContent: "flex-end" }}>
            <Space>
              <Button
                type="primary"
                style={{ minWidth: 120, fontWeight: "bold" }}
                disabled
              >
                Time Left: {formatTime(timeLeft)}
              </Button>
              <Button danger onClick={handleEndShift} style={{ minWidth: 120 }}>
                End Shift
              </Button>
            </Space>
          </Col>
        </Row>
        {orderView === "current" ? (
          orders.length === 0 ? (
            <Typography.Text>No orders yet.</Typography.Text>
          ) : (
            <Row gutter={[24, 24]}>
              {orders.map((order) => (
                <Col key={order.id} xs={24} sm={12} md={6}>
                  <OrderCard order={order} onComplete={handleCompleteOrder} />
                </Col>
              ))}
            </Row>
          )
        ) : (
          completedOrders.length === 0 ? (
            <Typography.Text>No completed orders yet.</Typography.Text>
          ) : (
            <Row gutter={[24, 24]}>
              {completedOrders.map((order) => (
                <Col key={order.id} xs={24} sm={12} md={6}>
                  <CompletedOrderCard order={order} />
                </Col>
              ))}
            </Row>
          )
        )}
      </div>
    </div>
  );

  // Shift ended
  const renderEndedShift = () => (
    <Row justify="center">
      <Col xs={24} sm={18} md={12}>
        <Card>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Title level={3}>Shift Ended</Typography.Title>
            <Typography.Text strong>
              Total Orders: {orders.length}
            </Typography.Text>
            <Typography.Text strong>
              Completed Orders: {completedOrders.length}
            </Typography.Text>
            {completedOrders.length > 0 && (
              <List
                size="small"
                header={<div><b>Completed Orders</b></div>}
                dataSource={completedOrders}
                renderItem={(order) => (
                  <List.Item>
                    <span>
                      #{order.id} | Created: {new Date(order.created).toLocaleTimeString()} | Completed: {new Date(order.completed).toLocaleTimeString()} | Time Taken: {((order.completed - order.created) / 1000).toFixed(1)}s
                      <br />
                      Items: {order.items.map(item => item.name).join(", ")}
                    </span>
                  </List.Item>
                )}
                style={{ background: "#fafafa", borderRadius: 4, marginBottom: 8 }}
              />
            )}
            {startTime && (
              <Typography.Text>
                <br />
                Start: {new Date(startTime).toLocaleString()}
              </Typography.Text>
            )}
            {endTime && (
              <Typography.Text>
                <br />
                End: {new Date(endTime).toLocaleString()}
              </Typography.Text>
            )}
            {saveResult && (
              <Alert
                message={saveResult}
                type={saveResult.startsWith("Error") ? "error" : "success"}
                showIcon
                style={{ margin: "12px 0" }}
              />
            )}
            <Button type="primary" onClick={handleReset}>
              Start New Shift
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );

  return (
    <div style={{ width: "100%", padding: 24 }}>
      {status === ShiftStatus.NotStarted && (
        <>
          {renderShiftHistory()}
          {renderStartShift()}
        </>
      )}
      {status === ShiftStatus.Active && renderActiveShift()}
      {status === ShiftStatus.Ended && renderEndedShift()}
    </div>
  );
};

export default Shift;
