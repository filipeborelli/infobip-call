import React, { useState, useEffect, useCallback, useRef } from 'react';
import InputMask from 'react-input-mask';
import { Phone, PhoneOff, Pause, Play, Mic, MicOff, Minimize2, Maximize2, X } from 'lucide-react';
// @ts-ignore
import { createInfobipRtc ,InfobipRTC, CallsApiEvents, CallsApiEvent} from 'infobip-rtc';
import { getToken } from './utils/api';
// const InfobipRTC = InfobipRTCModule.default || InfobipRTCModule;

function App() {
  const [phone, setPhone] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [infobipRTC, setInfobipRTC] = useState<InfobipRTC>();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [audioSource, setAudioSource] = useState('');
  const phoneRef = useRef<HTMLDivElement>(null);
  const remoteAudioRef : any= useRef<HTMLAudioElement>(null);


  const addEvent = useCallback((event: string) => {
    setEvents(prev => [...prev, `${new Date().toLocaleTimeString()} - ${event}`]);
  }, []);


  useEffect(() => {
    if (remoteAudioRef.current && audioSource) {
      // `audioSource` deve ser um MediaStream
      remoteAudioRef.current.srcObject = audioSource;
      
      // Em alguns navegadores pode ser preciso chamar play() manualmente.
      remoteAudioRef.current
        .play()
        .catch((err:any) => console.error('Erro ao reproduzir áudio remoto:', err));
    }
  }, [audioSource]);

  useEffect(() => {
    getToken().then((response) => {
      if (response?.token) {
        const infobipRTC = createInfobipRtc(response.token, {
          debug: true,
        })
      
        setInfobipRTC(infobipRTC);
        addEvent('InfobipRTC initialized');
      } else {
        addEvent('Error getting token');
      }
    });

  }, [addEvent]);

  useEffect(() => {
    let interval: number | undefined;
    if (isCallActive && !isPaused) {
      interval = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive, isPaused]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (phoneRef.current) {
      const rect = phoneRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Ensure the phone stays within the viewport
        const maxX = window.innerWidth - (phoneRef.current?.offsetWidth || 0);
        const maxY = window.innerHeight - (phoneRef.current?.offsetHeight || 0);

        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleKeypadPress = (digit: string) => {
    if (activeCall) {
      activeCall.sendDTMF(digit);
    }
    setPhone(prev => prev + digit);
  };

  const handleCall = async () => {
    if (!phone || !infobipRTC) return;
    

    if (isCallActive) {
      if (activeCall) {
        activeCall.hangup();
        addEvent('Call ended');
      }
      setIsCallActive(false);
      setActiveCall(null);
      setCallDuration(0);
      setIsPaused(false);
      setIsMuted(false);
    } else {
      try {
        const audioInput = await infobipRTC.getAudioInputDevices();
        console.log('Audio input devices:', audioInput);
        addEvent(`Audio input device set:`);
        infobipRTC.connect();
        // preciso resolver essa parte da conexão do RTC
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const call = infobipRTC.callPhone(phone);

        call.on(CallsApiEvent.ESTABLISHED, (event: any) => {
          setAudioSource(event.stream);
          console.log(event.stream);
          addEvent('Call established');
          setIsCallActive(true);
        });

        call.on(CallsApiEvent.HANGUP, () => {
          addEvent('Call hung up');
          setIsCallActive(false);
          setActiveCall(null);
          setCallDuration(0);
          setIsPaused(false);
          setIsMuted(false);
        });

        call.on(CallsApiEvent.ERROR, (error: any) => {
          console.log('Error:', error);
          addEvent(`Error: ${error.message}`);
          setIsCallActive(false);
          setActiveCall(null);
          setCallDuration(0);
          setIsPaused(false);
          setIsMuted(false);
        });

        setActiveCall(call);
        addEvent('Initiating call...');
      } catch (error) {
        addEvent(`Error initiating call: ${error}`);
      }
    }
  };

  const handlePauseResume = () => {
    if (activeCall) {
      if (isPaused) {
        activeCall.resume();
        addEvent('Call resumed');
      } else {
        activeCall.pause();
        addEvent('Call paused');
      }
      setIsPaused(!isPaused);
    }
  };

  const handleMute = () => {
    if (activeCall) {
      if (isMuted) {
        activeCall.unmute();
        addEvent('Call unmuted');
      } else {
        activeCall.mute();
        addEvent('Call muted');
      }
      setIsMuted(!isMuted);
    }
  };

  const keypadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4">
     <audio ref={remoteAudioRef} autoPlay controls style={{
      display: 'none'
     }} />

      <div
        ref={phoneRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 50,
          width: isMinimized ? '48px' : '240px',
          transition: isDragging ? 'none' : 'all 0.3s ease'
        }}
      >
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div
            className="bg-purple-600 p-2 flex items-center justify-between cursor-move"
            onMouseDown={handleMouseDown}
          >
            <h2 className={`text-white text-sm font-medium ${isMinimized ? 'hidden' : ''}`}>
               Hyperflow
            </h2>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:text-purple-200 transition-colors"
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
          </div>

          {/* Phone Interface */}
          {!isMinimized && (
            <div className="p-2 space-y-2">
              <div className="flex space-x-1">
                <InputMask
                  style={{
                    flex: 1,
                    height: '2.5rem',
                    marginRight: '0.5rem',
                    marginLeft: '0.5rem'
                  }}
                  mask="+99 99 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="+XX XX XXXXX-XXXX"
                />
                {isCallActive && (
                  <div className="flex items-center text-sm font-mono text-purple-600">
                    {formatDuration(callDuration)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1">
                {keypadButtons.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {row.map((digit) => (
                      <button
                        key={digit}
                        onClick={() => handleKeypadPress(digit)}
                        className="aspect-square rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium transition-colors"
                      >
                        {digit}
                      </button>
                    ))}
                  </React.Fragment>
                ))}
              </div>

              <div className="flex space-x-1">
                <button
                  onClick={handleCall}
                  style={{
                    flex: 1,
                    height: '2.5rem',

                  }}
                  className={`flex-1 py-1 px-2 rounded flex items-center justify-center space-x-1 text-white font-medium text-xs transition-colors ${isCallActive
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-purple-500 hover:bg-purple-600'
                    }`}
                >
                  {isCallActive ? (
                    <>
                      <PhoneOff className="w-3 h-3" />
                      <span>Encerrar</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-3 h-3" />
                      <span>Ligar</span>
                    </>
                  )}
                </button>

                {isCallActive && (
                  <>
                    <button
                      onClick={handlePauseResume}
                      className="p-1 rounded flex items-center justify-center text-white text-xs bg-yellow-500 hover:bg-yellow-600 transition-colors"
                    >
                      {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={handleMute}
                      className={`p-1 rounded flex items-center justify-center text-white text-xs transition-colors ${isMuted ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-500 hover:bg-green-600'
                        }`}
                    >
                      {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Events Log */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <img src="https://storage.sandbox.hyperflow.global/assets/logo.svg" alt="Hyperflow" className="h-8 mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Event Logs</h2>
          <div className="h-[calc(100vh-12rem)] overflow-y-auto space-y-2 bg-gray-50 p-4 rounded-lg">
            {events.map((event, index) => (
              <div
                key={index}
                className="text-sm text-gray-600 border-l-2 border-purple-400 pl-2"
              >
                {event}
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-gray-400 text-sm italic">No events yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;