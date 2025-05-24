import React, { useState, useEffect, useRef } from "react";

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
        <div>
          <h2>Start a Shift</h2>
          <label>
            Shift Duration (seconds):{" "}
            <input
              type="number"
              min={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ width: 80 }}
            />
          </label>
          <br />
          <button onClick={handleStartShift} style={{ marginTop: 16 }}>
            Start Shift
          </button>
        </div>
      )}

      {status === ShiftStatus.Active && (
        <div>
          <h2>Shift in Progress</h2>
          <div>
            <strong>Time Left:</strong> {timeLeft}s
          </div>
          <button onClick={handleEndShift} style={{ margin: "16px 0" }}>
            End Shift Early
          </button>
          <div>
            <h3>Orders</h3>
            {orders.length === 0 ? (
              <p>No orders yet.</p>
            ) : (
              <ul>
                {orders.map((order) => (
                  <li key={order.id}>
                    Order #{order.id} - {new Date(order.timestamp).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {status === ShiftStatus.Ended && (
        <div>
          <h2>Shift Ended</h2>
          <div>
            <strong>Total Orders:</strong> {orders.length}
          </div>
          {saveResult && (
            <div style={{ margin: "12px 0", color: saveResult.startsWith("Error") ? "red" : "green" }}>
              {saveResult}
            </div>
          )}
          <button onClick={handleReset} style={{ marginTop: 16 }}>
            Start New Shift
          </button>
        </div>
      )}
    </div>
  );
};

export default Shift;
