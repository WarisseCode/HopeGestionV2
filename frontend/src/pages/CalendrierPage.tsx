import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  parseISO, addWeeks, subWeeks, addDays, subDays, getHours, setHours, setMinutes
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, Settings, Clock, CheckCircle, AlertTriangle 
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input'; // Assuming Input exists
import { apiCall } from '../utils/apiUtils';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string
  type: 'payment' | 'contract' | 'intervention' | 'custom' | 'rdv' | 'rappel';
  amount?: number;
  details?: any;
  start_date?: string; // For custom events
  end_date?: string;
  is_all_day?: boolean;
}

interface ReminderSetting {
    id?: number;
    event_type: string;
    delay_days: number;
    channel: string;
    active: boolean;
}

const CalendrierPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'payment' | 'intervention'>('all');

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // New Event Form
  const [newEvent, setNewEvent] = useState({
      title: '',
      type: 'rdv',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      description: ''
  });

  // Settings Form
  const [settings, setSettings] = useState<ReminderSetting[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let start, end;
      if (viewMode === 'month') {
          start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
          end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      } else if (viewMode === 'week') {
          start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          end = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else {
          start = format(currentDate, 'yyyy-MM-dd');
          end = format(currentDate, 'yyyy-MM-dd');
      }
      
      const data = await apiCall<{ events: CalendarEvent[] }>(`${API_URL}/calendar?start=${start}&end=${end}`);
      setEvents(data.events);
    } catch (err) {
      console.error(err);
      toast.error("Erreur chargement calendrier");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
      try {
          const data = await apiCall<any>(`${API_URL}/calendar/settings`);
          setSettings(data);
      } catch (e) {
          console.error(e);
      }
  };

  const handleCreateEvent = async () => {
      try {
          const startDateTime = new Date(`${newEvent.date}T${newEvent.time}`);
          await apiCall(`${API_URL}/calendar/events`, {
              method: 'POST',
              body: JSON.stringify({
                  title: newEvent.title,
                  description: newEvent.description,
                  start_date: startDateTime.toISOString(),
                  type: newEvent.type,
                  is_all_day: false
              })
          });
          toast.success("Événement créé");
          setShowEventModal(false);
          fetchEvents();
          setNewEvent({ title: '', type: 'rdv', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', description: '' });
      } catch (e) {
          toast.error("Erreur création");
      }
  };

  const handleSaveSetting = async (setting: ReminderSetting) => {
      try {
          await apiCall(`${API_URL}/calendar/settings`, {
              method: 'POST',
              body: JSON.stringify(setting)
          });
          toast.success("Réglage sauvegardé");
          fetchSettings();
      } catch (e) {
          toast.error("Erreur sauvegarde");
      }
  };

  const navigateDate = (dir: 'prev' | 'next') => {
      if (viewMode === 'month') {
          setCurrentDate(dir === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
      } else if (viewMode === 'week') {
          setCurrentDate(dir === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
      } else {
          setCurrentDate(dir === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
      }
  };

  const renderMonthView = () => {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
      const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

      return (
        <div className="bg-base-100 rounded-3xl border border-base-200 shadow-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-base-200 bg-base-200">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold uppercase text-base-content/60">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr bg-base-200/30">
                {calendarDays.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
                    return (
                        <div key={day.toString()} className={`min-h-[120px] p-2 border-r border-b border-base-200 ${!isCurrentMonth ? 'bg-base-200/50' : 'bg-base-100'}`}>
                            <div className="text-right text-sm font-medium mb-1 text-base-content/50">{format(day, 'd')}</div>
                            <div className="space-y-1">
                                {dayEvents.slice(0, 3).map(e => (
                                    <div key={e.id} className={`text-[10px] p-1 rounded border truncate flex items-center gap-1 ${getEventColor(e.type)}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${getEventDot(e.type)}`}></div>
                                        {e.title}
                                    </div>
                                ))}
                                {dayEvents.length > 3 && <div className="text-[10px] text-center text-base-content/50">+{dayEvents.length - 3} autres</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      );
  };

  const renderWeekView = () => {
      const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });
      const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8h to 20h

      return (
          <div className="bg-base-100 rounded-xl shadow border overflow-auto">
              <div className="grid grid-cols-8 border-b">
                  <div className="p-4 border-r text-xs text-base-content/50">Heure</div>
                  {weekDays.map(day => (
                      <div key={day.toString()} className={`p-4 border-r text-center ${isSameDay(day, new Date()) ? 'bg-teal-50' : ''}`}>
                          <div className="font-bold text-base-content/90">{format(day, 'EEEE', { locale: fr })}</div>
                          <div className="text-sm text-base-content/60">{format(day, 'd MMM')}</div>
                      </div>
                  ))}
              </div>
              <div>
                  {hours.map(hour => (
                      <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
                          <div className="p-2 border-r text-xs text-center text-base-content/50">{hour}:00</div>
                          {weekDays.map(day => {
                            const hourEvents = events.filter(e => {
                                const d = parseISO(e.date);
                                return isSameDay(d, day) && (e.type === 'custom' || e.type === 'rdv' ? getHours(d) === hour : hour === 8); // Display non-timed events at 8am
                            });
                            return (
                                <div key={day.toString()} className="border-r p-1 relative">
                                    {hourEvents.map(e => (
                                        <div key={e.id} className={`text-[10px] p-1 mb-1 rounded border ${getEventColor(e.type)}`}>
                                            {e.title}
                                        </div>
                                    ))}
                                </div>
                            );
                          })}
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const getEventColor = (type: string) => {
      switch(type) {
          case 'payment': return 'bg-green-50 text-green-700 border-green-200';
          case 'intervention': return 'bg-orange-50 text-orange-700 border-orange-200';
          case 'contract': return 'bg-red-50 text-red-700 border-red-200';
          case 'rdv': return 'bg-teal-50 text-teal-700 border-teal-200';
          default: return 'bg-base-200 text-base-content/80 border-base-300';
      }
  };
  const getEventDot = (type: string) => {
      switch(type) {
          case 'payment': return 'bg-green-500';
          case 'notification': return 'bg-teal-500';
          default: return 'bg-teal-500';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-primary" /> Agenda
          </h1>
          <p className="opacity-60">Gérez vos échéances et rappels</p>
        </div>

        <div className="flex items-center gap-2 bg-base-100 p-1 rounded-lg border border-base-200">
           <Button variant="ghost" size="sm" onClick={() => navigateDate('prev')}><ChevronLeft size={20}/></Button>
           <span className="font-bold min-w-[200px] text-center capitalize">
             {viewMode === 'month' ? format(currentDate, 'MMMM yyyy', { locale: fr }) : 
              viewMode === 'week' ? `Semaine du ${format(startOfWeek(currentDate, {weekStartsOn:1}), 'd MMM')}` : 
              format(currentDate, 'd MMMM yyyy', { locale: fr })}
           </span>
           <Button variant="ghost" size="sm" onClick={() => navigateDate('next')}><ChevronRight size={20}/></Button>
        </div>

        <div className="flex gap-2">
            <div className="flex bg-base-300 rounded-lg p-1">
                <button onClick={() => setViewMode('month')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'month' ? 'bg-base-100 shadow' : ''}`}>Mois</button>
                <button onClick={() => setViewMode('week')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'week' ? 'bg-base-100 shadow' : ''}`}>Semaine</button>
                <button onClick={() => setViewMode('day')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'day' ? 'bg-base-100 shadow' : ''}`}>Jour</button>
            </div>
            <Button variant="secondary" onClick={() => { setShowSettingsModal(true); fetchSettings(); }}>
                <Settings size={18} />
            </Button>
            <Button onClick={() => setShowEventModal(true)}>
                <Plus size={18} className="mr-2" /> Événement
            </Button>
        </div>
      </div>

      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && (
          <div className="bg-base-100 rounded-xl shadow p-6">
              <h3 className="font-bold mb-4 border-b pb-2">Événements du jour</h3>
              <div className="space-y-2">
                  {events.length === 0 ? <p className="text-base-content/50">Aucun événement</p> : events.map(e => (
                      <div key={e.id} className={`p-3 rounded-lg border flex justify-between items-center ${getEventColor(e.type)}`}>
                          <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getEventDot(e.type)}`}></div>
                              <div>
                                  <div className="font-bold">{e.title}</div>
                                  <div className="text-xs opacity-75">{e.type.toUpperCase()}</div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Add Event Modal */}
      {showEventModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md p-6">
                  <h3 className="text-lg font-bold mb-4">Nouvel Événement</h3>
                  <div className="space-y-3">
                      <Input label="Titre" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                          <Input type="date" label="Date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                          <Input type="time" label="Heure" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <select className="w-full border rounded-lg p-2" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}>
                              <option value="rdv">Rendez-vous</option>
                              <option value="rappel">Rappel</option>
                              <option value="custom">Autre</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <textarea className="w-full border rounded-lg p-2" rows={3} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                          <Button variant="secondary" onClick={() => setShowEventModal(false)}>Annuler</Button>
                          <Button onClick={handleCreateEvent}>Enregistrer</Button>
                      </div>
                  </div>
              </Card>
          </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Settings size={20}/> Configuration des Rappels
                </h3>
                
                <div className="space-y-4 mb-6">
                    <p className="text-sm text-base-content/60">Définissez quand et comment vous souhaitez être notifié.</p>
                    
                    {/* Simplified Settings Form for Demo */}
                    <div className="p-3 bg-base-200 rounded-lg border flex items-center justify-between">
                        <div>
                            <div className="font-bold text-base-content/80">Loyers à échoir</div>
                            <div className="text-xs text-base-content/60">Rappel aux locataires pour le paiement</div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <select className="text-sm border rounded p-1" onChange={(e) => handleSaveSetting({event_type: 'payment', delay_days: -parseInt(e.target.value), channel: 'email', active: true})}>
                                <option value="3">3 jours avant</option>
                                <option value="7">7 jours avant</option>
                                <option value="1">1 jour avant</option>
                            </select>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Actif</span>
                        </div>
                    </div>

                    <div className="p-3 bg-base-200 rounded-lg border flex items-center justify-between">
                        <div>
                            <div className="font-bold text-base-content/80">Fins de Contrat</div>
                            <div className="text-xs text-base-content/60">Anticipation des renouvellements</div>
                        </div>
                         <div className="flex gap-2 items-center">
                            <select className="text-sm border rounded p-1" onChange={(e) => handleSaveSetting({event_type: 'contract_end', delay_days: -parseInt(e.target.value), channel: 'email', active: true})}>
                                <option value="30">30 jours avant</option>
                                <option value="60">60 jours avant</option>
                                <option value="90">90 jours avant</option>
                            </select>
                             <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Actif</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={() => setShowSettingsModal(false)}>Fermer</Button>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};

export default CalendrierPage;
