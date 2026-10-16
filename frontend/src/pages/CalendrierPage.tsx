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
import ModalDialog from '../components/ui/ModalDialog';
import LoadErrorState from '../components/ui/LoadErrorState';
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

// Noms accessibles des flèches Précédent/Suivant selon la vue affichée (T-050)
const PREV_LABEL = { month: 'Mois précédent', week: 'Semaine précédente', day: 'Jour précédent' } as const;
const NEXT_LABEL = { month: 'Mois suivant', week: 'Semaine suivante', day: 'Jour suivant' } as const;

// Pastille du jour courant, mêmes dimensions que la ligne de texte (text-sm) pour ne pas changer la taille des cellules (T-053)
const TODAY_BADGE = 'inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-content';

// Lignes de la modale Rappels : délais proposés (en jours avant l'échéance) (T-053)
const REMINDER_ROWS = [
    { event_type: 'payment', title: 'Loyers à échoir', subtitle: 'Rappel aux locataires pour le paiement', options: [3, 7, 1] },
    { event_type: 'contract_end', title: 'Fins de Contrat', subtitle: 'Anticipation des renouvellements', options: [30, 60, 90] },
];
const delayLabel = (n: number) => `${n} jour${n > 1 ? 's' : ''} avant`;

const CalendrierPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // true dès le montage : la grille s'affichait vide, sans indicateur, avant la réponse (T-042)
  const [loading, setLoading] = useState(true);
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
  // Les select affichaient toujours « 3 jours / 30 jours » même en cas d'échec du chargement, et le
  // premier changement écrasait alors le réglage serveur : aucune écriture avant 'ready' (T-053)
  const [settingsStatus, setSettingsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  // Valeur choisie en cours d'enregistrement (affichée tout de suite, retirée en cas d'échec)
  const [pendingDelay, setPendingDelay] = useState<Record<string, number>>({});

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
      setSettingsStatus('loading');
      setSettingsError(null);
      try {
          const data = await apiCall<ReminderSetting[]>(`${API_URL}/calendar/settings`);
          // Réponse inattendue : traitée comme un échec, sinon « Non configuré » s'afficherait à tort (relecture Codex)
          if (!Array.isArray(data)) throw new Error('Réponse invalide du serveur');
          setSettings(data);
          setSettingsStatus('ready');
      } catch (e) {
          console.error(e);
          setSettingsError((e as Error)?.message || 'Erreur lors du chargement des réglages');
          setSettingsStatus('error');
      }
  };

  const handleCreateEvent = async () => {
      // Titre obligatoire : un événement sans titre partait et « Événement créé » s'affichait (T-047)
      if (!newEvent.title.trim()) {
          toast.error("Titre de l'événement requis");
          return;
      }
      // Date effacée : new Date('T09:00').toISOString() levait un RangeError, affiché « Erreur création » (T-053)
      if (!newEvent.date) {
          toast.error("Date de l'événement requise");
          return;
      }
      const startDateTime = new Date(`${newEvent.date}T${newEvent.time}`);
      if (Number.isNaN(startDateTime.getTime())) {
          toast.error("Date ou heure de l'événement invalide");
          return;
      }
      try {
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

  const handleSaveSetting = async (eventType: string, delay: number) => {
      // Aucune écriture tant que les réglages réels ne sont pas chargés, ni pendant un enregistrement (T-053)
      if (settingsStatus !== 'ready' || pendingDelay[eventType] !== undefined) return;
      const saved = settings.find(s => s.event_type === eventType);
      setPendingDelay(p => ({ ...p, [eventType]: delay }));
      try {
          // delay_days positif : l'API refuse les valeurs négatives (isInt min 0), le Cron utilise Math.abs (T-053)
          const row = await apiCall<ReminderSetting>(`${API_URL}/calendar/settings`, {
              method: 'POST',
              body: JSON.stringify({
                  event_type: eventType,
                  delay_days: delay,
                  channel: saved?.channel ?? 'email',
                  active: saved?.active ?? true
              })
          });
          const next: ReminderSetting = row && row.event_type === eventType
              ? row
              : { ...saved, event_type: eventType, delay_days: delay, channel: saved?.channel ?? 'email', active: saved?.active ?? true };
          setSettings(list => [...list.filter(s => s.event_type !== eventType), next]);
          toast.success("Réglage sauvegardé");
      } catch (e) {
          console.error(e);
          toast.error("Erreur sauvegarde : valeur précédente rétablie");
      } finally {
          setPendingDelay(p => {
              const rest = { ...p };
              delete rest[eventType];
              return rest;
          });
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
                    <div key={day} className="py-3 text-center text-xs font-bold uppercase text-base-content/70">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr bg-base-200/30">
                {calendarDays.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());
                    const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
                    const count = dayEvents.length;
                    // Cellule cliquable : ouvre la vue Jour sur cette date (titres coupés et « +N autres » inaccessibles à 375 px) (T-053)
                    return (
                        <button
                            type="button"
                            key={day.toString()}
                            onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                            aria-label={`${format(day, 'd MMMM', { locale: fr })}, ${count === 0 ? 'aucun événement' : `${count} événement${count > 1 ? 's' : ''}`}`}
                            aria-current={isToday ? 'date' : undefined}
                            className={`flex flex-col justify-start w-full min-w-0 text-left min-h-[120px] p-2 border-r border-b border-base-200 cursor-pointer hover:bg-base-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${!isCurrentMonth ? 'bg-base-200/50' : 'bg-base-100'}`}
                        >
                            <span className="block text-right text-sm font-medium mb-1 text-base-content/70">
                                <span className={isToday ? TODAY_BADGE : undefined}>{format(day, 'd')}</span>
                            </span>
                            {/* Sous sm : pastilles de couleur par type + compteur, à la place du texte coupé */}
                            <span className="flex sm:hidden flex-wrap items-center gap-1" aria-hidden="true">
                                {dayEvents.slice(0, 3).map(e => (
                                    <span key={e.id} title={e.title} className={`w-2 h-2 rounded-full ${getEventDot(e.type)}`}></span>
                                ))}
                                {count > 3 && <span className="text-xs leading-none text-base-content/70">+{count - 3}</span>}
                            </span>
                            <span className="hidden sm:block space-y-1">
                                {dayEvents.slice(0, 3).map(e => (
                                    <span key={e.id} title={e.title} className={`text-[10px] p-1 rounded border truncate flex items-center gap-1 ${getEventColor(e.type)}`}>
                                        <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${getEventDot(e.type)}`}></span>
                                        <span className="truncate">{e.title}</span>
                                    </span>
                                ))}
                                {count > 3 && <span className="block text-[10px] text-center text-base-content/70">+{count - 3} autres</span>}
                            </span>
                        </button>
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
                  <div className="p-4 border-r text-xs text-base-content/70">Heure</div>
                  {weekDays.map(day => {
                      const isToday = isSameDay(day, new Date());
                      // bg-teal-50 codé en dur : texte clair du thème sombre à 1,03:1 ; fond lié au thème (T-053)
                      return (
                          <div key={day.toString()} aria-current={isToday ? 'date' : undefined} className={`p-4 border-r text-center ${isToday ? 'bg-primary/10' : ''}`}>
                              <div className="font-bold text-base-content/90">{format(day, 'EEEE', { locale: fr })}</div>
                              <div className="text-sm text-base-content/70">
                                  <span className={isToday ? TODAY_BADGE : undefined}>{format(day, 'd')}</span> {format(day, 'MMM')}
                              </div>
                          </div>
                      );
                  })}
              </div>
              <div>
                  {hours.map(hour => (
                      <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
                          <div className="p-2 border-r text-xs text-center text-base-content/70">{hour}:00</div>
                          {weekDays.map(day => {
                            const hourEvents = events.filter(e => {
                                const d = parseISO(e.date);
                                return isSameDay(d, day) && (e.type === 'custom' || e.type === 'rdv' ? getHours(d) === hour : hour === 8); // Display non-timed events at 8am
                            });
                            return (
                                <div key={day.toString()} className="border-r p-1 relative">
                                    {hourEvents.map(e => (
                                        <div key={e.id} title={e.title} className={`text-[10px] p-1 mb-1 rounded border ${getEventColor(e.type)}`}>
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

  // Variantes dark: (motif T-051) : les puces claires restaient claires en thème sombre (T-053)
  const getEventColor = (type: string) => {
      switch(type) {
          case 'payment': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
          case 'intervention': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
          case 'contract': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
          case 'rdv': return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800';
          default: return 'bg-base-200 text-base-content/80 border-base-300';
      }
  };
  // Une couleur par type (pastilles mobiles) ; les -500 étaient sous 3:1 sur les puces -50 (T-053)
  const getEventDot = (type: string) => {
      switch(type) {
          case 'payment': return 'bg-green-600 dark:bg-green-400';
          case 'intervention': return 'bg-orange-600 dark:bg-orange-400';
          case 'contract': return 'bg-red-600 dark:bg-red-400';
          case 'rdv': return 'bg-teal-600 dark:bg-teal-400';
          default: return 'bg-base-content/60';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-primary" /> Agenda
          </h1>
          <p className="text-base-content/70">Gérez vos échéances et rappels</p>
        </div>

        <div className="flex items-center gap-2 bg-base-100 p-1 rounded-lg border border-base-200">
           {/* Boutons icône sans nom : libellé selon la vue (T-050) */}
           <Button variant="ghost" size="sm" onClick={() => navigateDate('prev')} aria-label={PREV_LABEL[viewMode]} title={PREV_LABEL[viewMode]}><ChevronLeft size={20}/></Button>
           <span className="font-bold min-w-[200px] text-center capitalize">
             {viewMode === 'month' ? format(currentDate, 'MMMM yyyy', { locale: fr }) :
              viewMode === 'week' ? `Semaine du ${format(startOfWeek(currentDate, {weekStartsOn:1}), 'd MMM')}` :
              // Vue Jour : même pastille que Mois/Semaine si la date affichée est aujourd'hui (T-053)
              <span aria-current={isSameDay(currentDate, new Date()) ? 'date' : undefined}>
                  <span className={isSameDay(currentDate, new Date()) ? TODAY_BADGE : undefined}>{format(currentDate, 'd')}</span> {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </span>}
           </span>
           <Button variant="ghost" size="sm" onClick={() => navigateDate('next')} aria-label={NEXT_LABEL[viewMode]} title={NEXT_LABEL[viewMode]}><ChevronRight size={20}/></Button>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap justify-center gap-2">
            <div className="flex bg-base-300 rounded-lg p-1">
                <button onClick={() => setViewMode('month')} aria-pressed={viewMode === 'month'} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'month' ? 'bg-base-100 shadow' : ''}`}>Mois</button>
                <button onClick={() => setViewMode('week')} aria-pressed={viewMode === 'week'} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'week' ? 'bg-base-100 shadow' : ''}`}>Semaine</button>
                <button onClick={() => setViewMode('day')} aria-pressed={viewMode === 'day'} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'day' ? 'bg-base-100 shadow' : ''}`}>Jour</button>
            </div>
            <Button variant="secondary" onClick={() => { setShowSettingsModal(true); fetchSettings(); }} aria-label="Configurer les rappels" title="Configurer les rappels">
                <Settings size={18} />
            </Button>
            <Button onClick={() => setShowEventModal(true)}>
                <Plus size={18} className="mr-2" /> Événement
            </Button>
        </div>
      </div>

      <div className="relative" aria-busy={loading}>
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && (
          <div className="bg-base-100 rounded-xl shadow p-6">
              <h3 className="font-bold mb-4 border-b pb-2">Événements du jour</h3>
              <div className="space-y-2">
                  {events.length === 0 && !loading ? <p className="text-base-content/70">Aucun événement</p> : events.map(e => (
                      <div key={e.id} className={`p-3 rounded-lg border flex justify-between items-center ${getEventColor(e.type)}`}>
                          <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getEventDot(e.type)}`}></div>
                              <div>
                                  <div className="font-bold">{e.title}</div>
                                  <div className="text-xs">{e.type.toUpperCase()}</div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
      {loading && (
          // Voile + spinner (même spinner DaisyUI qu'Alertes) tant que les événements ne sont pas reçus
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-24 bg-base-100/60 rounded-xl">
              <span className="loading loading-spinner loading-lg text-primary" aria-label="Chargement des événements" />
          </div>
      )}
      </div>

      {/* Add Event Modal */}
      {showEventModal && (
          <ModalDialog onClose={() => setShowEventModal(false)} labelledBy="calendar-event-title" className="max-w-md">
              <Card className="w-full p-6">
                  <h3 id="calendar-event-title" className="text-lg font-bold mb-4">Nouvel Événement</h3>
                  <div className="space-y-3">
                      <Input label="Titre" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                          <Input type="date" label="Date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                          <Input type="time" label="Heure" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <select className="w-full border border-base-content/50 rounded-lg p-2" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}>
                              <option value="rdv">Rendez-vous</option>
                              <option value="rappel">Rappel</option>
                              <option value="custom">Autre</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <textarea className="w-full border border-base-content/50 rounded-lg p-2" rows={3} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                          <Button variant="secondary" onClick={() => setShowEventModal(false)}>Annuler</Button>
                          <Button onClick={handleCreateEvent}>Enregistrer</Button>
                      </div>
                  </div>
              </Card>
          </ModalDialog>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <ModalDialog onClose={() => setShowSettingsModal(false)} labelledBy="calendar-settings-title" className="max-w-lg">
            <Card className="w-full p-6">
                <h3 id="calendar-settings-title" className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Settings size={20}/> Configuration des Rappels
                </h3>
                
                <div className="space-y-4 mb-6">
                    <p className="text-sm text-base-content/70">Définissez quand et comment vous souhaitez être notifié.</p>
                    
                    {settingsStatus === 'error' ? (
                        // Échec du chargement : aucun select, donc aucune écriture possible (motif T-042/T-047)
                        <LoadErrorState message={settingsError} onRetry={fetchSettings} />
                    ) : (
                        <>
                            {settingsStatus === 'loading' && (
                                <div className="flex justify-center">
                                    <span className="loading loading-spinner loading-md text-primary" role="status" aria-label="Chargement des réglages" />
                                </div>
                            )}
                            {REMINDER_ROWS.map(row => {
                                const saved = settings.find(s => s.event_type === row.event_type);
                                const savedDelay = saved ? Math.abs(saved.delay_days) : undefined;
                                const shown = pendingDelay[row.event_type] ?? savedDelay;
                                // Valeur enregistrée hors liste (ex. 5 jours) : ajoutée pour que l'affichage reflète le serveur
                                const options = shown !== undefined && !row.options.includes(shown) ? [shown, ...row.options] : row.options;
                                return (
                                    <div key={row.event_type} className="p-3 bg-base-200 rounded-lg border flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-base-content/80">{row.title}</div>
                                            <div className="text-xs text-base-content/70">{row.subtitle}</div>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <select
                                                className="text-sm border border-base-content/50 rounded p-1"
                                                value={shown === undefined ? '' : String(shown)}
                                                disabled={settingsStatus !== 'ready' || pendingDelay[row.event_type] !== undefined}
                                                onChange={(e) => handleSaveSetting(row.event_type, parseInt(e.target.value, 10))}
                                            >
                                                {shown === undefined && <option value="" disabled>—</option>}
                                                {options.map(n => <option key={n} value={String(n)}>{delayLabel(n)}</option>)}
                                            </select>
                                            {settingsStatus === 'ready' && (saved
                                                ? <span className={`text-xs px-2 py-1 rounded ${saved.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-base-300 text-base-content/80'}`}>{saved.active ? 'Actif' : 'Inactif'}</span>
                                                : <span className="text-xs px-2 py-1 rounded bg-base-300 text-base-content/80">Non configuré</span>)}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button onClick={() => setShowSettingsModal(false)}>Fermer</Button>
                </div>
            </Card>
        </ModalDialog>
      )}
    </div>
  );
};

export default CalendrierPage;
