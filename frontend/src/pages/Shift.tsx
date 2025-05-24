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
} from "antd";

type Order = {
  id: number;
  timestamp: number;
  items: string[];
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
    setStatus(ShiftStatus.Active);
  };

  // End shift (early or on timer)
  const handleEndShift = () => {
    setEndTime(Date.now());
    setStatus(ShiftStatus.Ended);
  };

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
      setOrders((prev) => [
        ...prev,
        {
          id: orderId,
          timestamp: Date.now(),
          items: ["Placeholder item"],
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
              style={{ minHeight: 220, display: "flex", flexDirection: "column" }}
              bodyStyle={{ display: "flex", flexDirection: "column", height: 160, padding: 12 }}
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
                Start: {new Date(shift.startTime).toLocaleTimeString()}
              </Typography.Text>
              <br />
              <Typography.Text>
                End: {new Date(shift.endTime).toLocaleTimeString()}
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
    <Row justify="center">
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

  // Shift in progress
  const renderActiveShift = () => (
    <Row justify="center">
      <Col xs={24} sm={18} md={12}>
        <Card>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Title level={3}>Shift in Progress</Typography.Title>
            <Typography.Text strong>
              Time Left: {formatTime(timeLeft)}
            </Typography.Text>
            <Button danger onClick={handleEndShift}>
              End Shift Early
            </Button>
            <Typography.Title level={4}>Orders</Typography.Title>
            {orders.length === 0 ? (
              <Typography.Text>No orders yet.</Typography.Text>
            ) : (
              <List
                bordered
                dataSource={orders}
                renderItem={(order) => (
                  <List.Item>
                    Order #{order.id} - {new Date(order.timestamp).toLocaleTimeString()}
                  </List.Item>
                )}
                style={{ maxHeight: 200, overflowY: "auto" }}
              />
            )}
          </Space>
        </Card>
      </Col>
    </Row>
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
            <Button style={{ marginTop: 8 }} onClick={handleReset}>
              Return to Main
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
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
