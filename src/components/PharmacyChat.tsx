import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CustomerData {
  name?: string;
  phone?: string;
  address?: string;
  medicines?: Array<{ name: string; quantity: string }>;
  isComplete: boolean;
}

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const PharmacyChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [customerData, setCustomerData] = useState<CustomerData>({ isComplete: false });
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('/functions/v1/pharmacy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          phone: 'test-customer-123',
          user_id: 'pharmacy-owner-id' // Get from auth context
        })
      });

      const data = await response.json();
      
      const botMessage = { text: data.response, isUser: false, timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
      
      if (data.order_complete) {
        setCustomerData({ ...customerData, isComplete: true });
        console.log('Order completed:', data.order_lead_id);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = { text: 'Sorry, something went wrong', isUser: false, timestamp: new Date() };
      setMessages(prev => [...prev, errorMessage]);
    }

    setInput('');
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pharmacy Chat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-96 overflow-y-auto border rounded p-4 space-y-2">
              {messages.map((msg, idx) => (
                <div key={idx} className={`p-2 rounded ${msg.isUser ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'}`}>
                  <p className="text-sm">{msg.text}</p>
                  <span className="text-xs text-gray-500">{msg.timestamp.toLocaleTimeString()}</span>
                </div>
              ))}
              {loading && <div className="text-center text-gray-500">Typing...</div>}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message... (English/Hindi/Hinglish)"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={loading}>Send</Button>
            </div>
            
            <div className="text-xs text-gray-600">
              Try: "मुझे दवाई चाहिए", "I need medicine", "mujhe paracetamol chahiye"
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {customerData.name || 'Not provided'}</div>
              <div><strong>Phone:</strong> {customerData.phone || 'Not provided'}</div>
              <div><strong>Address:</strong> {customerData.address || 'Not provided'}</div>
              <div><strong>Medicines:</strong></div>
              {customerData.medicines?.length ? (
                <ul className="ml-4 list-disc">
                  {customerData.medicines.map((med, idx) => (
                    <li key={idx}>{med.name} - {med.quantity}</li>
                  ))}
                </ul>
              ) : (
                <div className="ml-4 text-gray-500">None specified</div>
              )}
              <div className={`font-bold ${customerData.isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                Status: {customerData.isComplete ? 'Order Complete ✓' : 'Collecting Info...'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
