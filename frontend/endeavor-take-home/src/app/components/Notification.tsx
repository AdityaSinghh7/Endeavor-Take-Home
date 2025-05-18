interface NotificationProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

const Notification = ({ message, type = 'info' }: NotificationProps) => {
  let bg = 'bg-blue-100 text-blue-800';
  if (type === 'success') bg = 'bg-green-100 text-green-800';
  if (type === 'error') bg = 'bg-red-100 text-red-800';
  return (
    <div className={`p-4 rounded mb-4 ${bg}`}>{message}</div>
  );
};

export default Notification;
