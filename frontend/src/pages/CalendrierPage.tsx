import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  parseISO 
} from 'date-fns';
import { fr } from 'date-fns/locale'; // Pour afficher les mois en français
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import Button from '../components/ui/Button';
import { getToken } from '../api/authApi';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string
  type: 'payment' | 'contract' | 'intervention';
  amount?: number;
  details?: any;
}

const CalendrierPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'payment' | 'intervention'>('all');

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      const token = getToken();
      const response = await fetch(`http://localhost:5000/api/calendar?start=${start}&end=${end}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if(response.ok) {
          const data = await response.json();
          setEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Semaine commence lundi
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayEvents = (day: Date) => {
    return events.filter(event => isSameDay(parseISO(event.date), day));
  };

  const filteredEventsForDay = (day: Date) => {
      let dayEvents = getDayEvents(day);
      if (filter !== 'all') {
          dayEvents = dayEvents.filter(e => e.type === filter);
      }
      return dayEvents;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-primary" />
            Calendrier
          </h1>
          <p className="opacity-60">Visualisez vos échéances et interventions</p>
        </div>

        <div className="flex items-center gap-2 bg-base-100 p-1 rounded-lg border border-base-200">
           <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft size={20}/></Button>
           <span className="font-bold min-w-[150px] text-center capitalize">
             {format(currentDate, 'MMMM yyyy', { locale: fr })}
           </span>
           <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight size={20}/></Button>
        </div>

        <div className="flex gap-2">
            <select 
                className="select select-bordered select-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
            >
                <option value="all">Tout voir</option>
                <option value="payment">Loyers</option>
                <option value="intervention">Interventions</option>
            </select>
            <Button variant="primary" size="sm" onClick={fetchEvents}>Actualiser</Button>
        </div>
      </div>

      {/* Grille Calendrier */}
      {/* Grille Calendrier */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden ring-1 ring-black/5">
        {/* Jours Semaine - Header Gradient */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="py-4 text-center text-xs font-bold uppercase tracking-widest text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Jours Mois */}
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-50/30">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            const dayEvents = filteredEventsForDay(day);

            return (
              <div 
                key={day.toString()} 
                className={`
                  min-h-[160px] p-3 border-r border-b border-gray-100 transition-all duration-200
                  ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-300' : 'bg-white hover:bg-gray-50'}
                  ${isToday ? 'bg-indigo-50/60 ring-inset ring-2 ring-indigo-500/10 z-10' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                    <div className={`
                        text-sm font-bold w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300
                        ${isToday 
                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 scale-105' 
                            : 'text-gray-500'
                        }
                    `}>
                    {format(day, 'd')}
                    </div>
                </div>

                <div className="space-y-2">
                  {dayEvents.slice(0, 3).map(event => (
                    <div 
                      key={event.id}
                      className={`
                        text-xs px-2.5 py-2 rounded-lg border font-medium truncate cursor-pointer shadow-sm transition-all hover:-translate-y-0.5
                        ${event.type === 'payment' ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700 hover:shadow-emerald-100' : ''}
                        ${event.type === 'intervention' ? 'bg-amber-50 border-amber-200/60 text-amber-700 hover:shadow-amber-100' : ''}
                        ${event.type === 'contract' ? 'bg-rose-50 border-rose-200/60 text-rose-700 hover:shadow-rose-100' : ''}
                      `}
                      title={event.title}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full
                            ${event.type === 'payment' ? 'bg-emerald-500' : ''}
                            ${event.type === 'intervention' ? 'bg-amber-500' : ''}
                            ${event.type === 'contract' ? 'bg-rose-500' : ''}
                        `}></span>
                        <span className="truncate">{event.title}</span>
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                     <div className="text-[10px] text-center font-bold text-gray-400 mt-1">
                        +{dayEvents.length - 3} autres
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendrierPage;
