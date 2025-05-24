import React, { useState, useEffect, useRef } from "react";
import { InputNumber, Button, List, Typography, Card, Space, Alert } from "antd";

type Order = {
  id: number;
  timestamp: number;
  items: string[]; // Placeholder for now
};

enum ShiftStatus {
  NotStarted,
  Active,
  Ended,
}

const getRandomDelay = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const Shift: React.FC = () => {
  const [shiftDuration, setShiftDuration] = useState<number>(60); // seconds
  const [inputValue, setInputValue] = useState<string>("60");
  const [status, setStatus] = useState<ShiftStatus>(ShiftStatus.NotStarted);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderId, setOrderId] = useState<number>(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const orderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start shift
  const handleStartShift = () => {
    const duration = parseInt(inputValue, 10);
    if (isNaN(duration) || duration <= 0) return;
    setShiftDuration(duration);
    setTimeLeft(duration);
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
          shiftDuration,
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
          .then((data) => {
            setSaveResult("Shift saved successfully!");
          })
          .catch((err) => {
            setSaveResult("Error saving shift: " + err.message);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, startTime, endTime]);

  // Reset to initial state after shift ends
  const handleReset = () => {
    setStatus(ShiftStatus.NotStarted);
    setInputValue("60");
    setShiftDuration(60);
    setTimeLeft(60);
    setOrders([]);
    setOrderId(1);
    setStartTime(null);
    setEndTime(null);
    setSaveResult(null);
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 24 }}>
      {status === ShiftStatus.NotStarted && (
        <Card>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Title level={3}>Start a Shift</Typography.Title>
            <Typography.Text>Shift Duration (seconds):</Typography.Text>
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
      )}

      {status === ShiftStatus.Active && (
        <Card>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Title level={3}>Shift in Progress</Typography.Title>
            <Typography.Text strong>
              Time Left: {timeLeft}s
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
      )}

      {status === ShiftStatus.Ended && (
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
          </Space>
        </Card>
      )}
    </div>
  );
};

export default Shift;
