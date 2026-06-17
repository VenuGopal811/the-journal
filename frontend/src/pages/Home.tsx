import Chat from "../components/Chat";

interface HomeProps {
  onNewMessage: () => void;
}

export default function Home({ onNewMessage }: HomeProps) {
  return (
    <div className="h-full flex flex-col">
      <Chat onNewMessage={onNewMessage} />
    </div>
  );
}
