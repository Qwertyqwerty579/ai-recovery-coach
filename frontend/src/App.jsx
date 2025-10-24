import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;


const Icon = ({ path, className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const Card = ({ children, className }) => (
    <div className={`bg-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 ${className}`}>
        {children}
    </div>
);

const HomePage = ({ onStart }) => (
    <div className="text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            AI Recovery Coach
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            AI-based personalized recovery plans for athletes. 
        </p>
        <button
            onClick={onStart}
            className="bg-emerald-500 text-white font-bold py-3 px-8 rounded-full hover:bg-emerald-600 transition-all duration-300 text-lg shadow-lg"
        >
            Start recovery
        </button>
    </div>
);

const WellnessTracker = ({ onRatingAdded, setError }) => {
    const [pain, setPain] = useState(5);
    const [recovery, setRecovery] = useState(5);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.target);
        const ratingData = {
            date: formData.get('date') || new Date().toISOString().split('T')[0],
            pain_level: parseInt(pain),
            recovery_score: parseInt(recovery),
        };

        try {
            const response = await fetch(`${API_URL}/api/ratings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ratingData),
            });
            if (!response.ok) throw new Error('Не удалось сохранить оценку.');
            onRatingAdded(); 
            
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4 text-white">Daily rating</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-gray-700/50 p-2 rounded-lg text-white border-none focus:ring-2 focus:ring-emerald-400"/>
                <div>
                    <label className="block text-sm text-gray-300 mb-1">Pain level ({pain})</label>
                    <input name="pain_level" type="range" min="1" max="10" value={pain} onChange={e => setPain(e.target.value)} className="w-full"/>
                </div>
                <div>
                    <label className="block text-sm text-gray-300 mb-1">Recovery rating ({recovery})</label>
                    <input name="recovery_score" type="range" min="1" max="10" value={recovery} onChange={e => setRecovery(e.target.value)} className="w-full"/>
                </div>
                <button type="submit" className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition">Save</button>
            </form>
        </Card>
    );
};


const Dashboard = () => {
    const [workouts, setWorkouts] = useState([]);
    const [recoveryPlan, setRecoveryPlan] = useState(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);
    const [error, setError] = useState(null);
    const [intensityValue, setIntensityValue] = useState(5);
    const [progressData, setProgressData] = useState([]);

    const fetchWorkouts = async () => {
        try {
            const response = await fetch(`${API_URL}/api/workouts`);
            if (!response.ok) throw new Error('Could not upload workouts.');
            const data = await response.json();
            setWorkouts(data);
        } catch (err) {
            console.error("Failed to fetch workouts:", err);
            setError(err.message);
        }
    };
    
    const fetchProgressData = async () => {
        try {
            const response = await fetch(`${API_URL}/api/ratings`);
            if (!response.ok) throw new Error('Could not upload data for chart.');
            const data = await response.json();
            const formattedData = data.map(r => ({
                ...r,
                date: new Date(r.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
            }));
            setProgressData(formattedData);
        } catch (err) {
            console.error("Failed to fetch progress data:", err);
        }
    };
    
    useEffect(() => {
        fetchWorkouts();
        fetchProgressData();
    }, []);

    const handleAddWorkout = async (e) => {
        e.preventDefault();
        setError(null);
        setRecoveryPlan(null);

        const formData = new FormData(e.target);
        const newWorkoutData = {
            date: formData.get('date') || new Date().toISOString().split('T')[0],
            type: formData.get('type'),
            intensity: parseInt(formData.get('intensity')),
            duration: parseInt(formData.get('duration')),
            equipment: formData.get('equipment') || null
        };

        try {
            const workoutResponse = await fetch(`${API_URL}/api/workouts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWorkoutData),
            });
            if (!workoutResponse.ok) throw new Error('Could not add a workout');
            
            await fetchWorkouts();
            e.target.reset();
            setIntensityValue(5);
            
            setIsLoadingPlan(true);
            const planResponse = await fetch(`${API_URL}/api/generate-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWorkoutData)
            });
            if (!planResponse.ok) {
                const errData = await planResponse.json();
                throw new Error(errData.detail || 'Could not generate a plan');
            }
            const plan = await planResponse.json();
            setRecoveryPlan(plan);

        } catch (error) {
            console.error("Error during workout submission:", error);
            setError(`Error occured: ${error.message}`);
        } finally {
            setIsLoadingPlan(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl">
            <div className="lg:col-span-1 flex flex-col gap-8">
                <Card>
                    <h2 className="text-2xl font-bold mb-4 text-white">Add workout</h2>
                    <form onSubmit={handleAddWorkout} className="space-y-4">
                        <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-gray-700/50 p-2 rounded-lg text-white border-none focus:ring-2 focus:ring-emerald-400"/>
                        <input name="type" type="text" placeholder="Workout type" required className="w-full bg-gray-700/50 p-2 rounded-lg text-white border-none focus:ring-2 focus:ring-emerald-400"/>
                        <input name="duration" type="number" placeholder="Duration (min)" required className="w-full bg-gray-700/50 p-2 rounded-lg text-white border-none focus:ring-2 focus:ring-emerald-400"/>
                        <input name="equipment" type="text" placeholder="Equipment (if available)" className="w-full bg-gray-700/50 p-2 rounded-lg text-white border-none focus:ring-2 focus:ring-emerald-400"/>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Intensity ({intensityValue})</label>
                            <input name="intensity" type="range" min="1" max="10" value={intensityValue} onChange={(e) => setIntensityValue(e.target.value)} className="w-full"/>
                        </div>
                        <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-2 rounded-lg hover:bg-emerald-600 transition">Add</button>
                    </form>
                </Card>

                <WellnessTracker onRatingAdded={fetchProgressData} setError={setError} />

                {isLoadingPlan && <Card><p className="text-center text-white animate-pulse">Generating a plan...</p></Card>}
                {recoveryPlan && (
                    <Card>
                        <h2 className="text-2xl font-bold mb-4 text-white">{recoveryPlan.title}</h2>
                        <p className="text-gray-300 mb-2">Duration: {recoveryPlan.duration_minutes} min.</p>
                        <ul className="space-y-2 list-disc list-inside text-white">
                            {recoveryPlan.exercises.map((ex, i) => <li key={i}>{ex}</li>)}
                        </ul>
                        <p className="text-sm text-emerald-300 mt-4">{recoveryPlan.notes}</p>
                    </Card>
                )}
                 {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>

            <div className="lg:col-span-2 flex flex-col gap-8">
                <Card>
                    <h2 className="text-2xl font-bold mb-4 text-white">Recovery progress</h2>
                     {progressData.length > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <LineChart data={progressData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                                    <XAxis dataKey="date" stroke="#9ca3af"/>
                                    <YAxis stroke="#9ca3af" domain={[0, 10]}/>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="pain_level" name="Pain level" stroke="#ef4444" activeDot={{ r: 8 }} />
                                    <Line type="monotone" dataKey="recovery_score" name="Recovery rating" stroke="#10b981" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                     ) : (
                        <p className="text-gray-400 text-center py-12">No data for chart yet. Add your first daily rating.</p>
                     )}
                </Card>
                <Card>
                    <h2 className="text-2xl font-bold mb-4 text-white">Workouts history</h2>
                    <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {workouts.length > 0 ? workouts.map(w => (
                           <li key={w.id} className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">{w.type}</p>
                                    <p className="text-sm text-gray-300">{new Date(w.date).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white">{w.duration} min</p>
                                    <p className="text-sm text-emerald-400">Intens: {w.intensity}/10</p>
                                </div>
                           </li>
                        )) : <p className="text-gray-400">No workouts yet.</p>}
                    </ul>
                </Card>
            </div>
        </div>
    );
};

const AiChat = () => {
    const [messages, setMessages] = useState([
        { from: 'coach', text: "Hello! I'm your AI Recovery Coach. How do you feel today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { from: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_message: input })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const coachMessage = { from: 'coach', text: data.coach_response };
            setMessages(prev => [...prev, coachMessage]);

        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage = { from: 'coach', text: "Извините, произошла ошибка. Не могу ответить прямо сейчас." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Card className="max-w-2xl mx-auto w-full h-[70vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4 text-white text-center">Чат с AI-тренером</h2>
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <p className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.from === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-gray-600 text-white rounded-bl-none'}`}>
                            {msg.text}
                        </p>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <p className="bg-gray-600 text-white p-3 rounded-2xl rounded-bl-none animate-pulse">typing...</p>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="mt-4 flex gap-2">
                <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask anything..."
                    disabled={isLoading}
                    className="flex-grow bg-gray-700/50 p-3 rounded-full text-white border-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                />
                <button onClick={handleSend} disabled={isLoading} className="bg-emerald-500 p-3 rounded-full text-white hover:bg-emerald-600 transition disabled:bg-emerald-800">
                    <Icon path="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </button>
            </div>
        </Card>
    );
};

export default function App() {
    const [page, setPage] = useState('home'); 

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard />;
            case 'chat':
                return <AiChat />;
            case 'home':
            default:
                return <HomePage onStart={() => setPage('dashboard')} />;
        }
    };
    
    return (
        <div className="bg-gray-900 min-h-screen text-gray-200 font-sans p-4 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse animation-delay-400"></div>

            <div className="relative z-10">
                {page !== 'home' && (
                    <nav className="flex justify-center gap-4 mb-8">
                        <button onClick={() => setPage('dashboard')} className={`px-4 py-2 rounded-full transition ${page === 'dashboard' ? 'bg-emerald-500 text-white' : 'hover:bg-white/10'}`}>
                            Control Panel
                        </button>
                        <button onClick={() => setPage('chat')} className={`px-4 py-2 rounded-full transition ${page === 'chat' ? 'bg-emerald-500 text-white' : 'hover:bg-white/10'}`}>
                            AI Chat
                        </button>
                    </nav>
                )}
                
                <main className={`flex items-center justify-center ${page === 'home' ? 'min-h-[80vh]' : ''}`}>
                    {renderPage()}
                </main>
            </div>
        </div>
    );
}

