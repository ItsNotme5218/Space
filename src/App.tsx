import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import './App.css';

function App() {
  const [activeItem, setActiveItem] = useState('home');

  return (
    <div className="min-h-screen bg-[#101010] relative overflow-hidden">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
      <TopBar />
      <main className="min-h-screen" />
    </div>
  );
}

export default App;
