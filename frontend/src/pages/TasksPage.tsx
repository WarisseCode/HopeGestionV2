import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Plus, Filter, Calendar, MessageSquare, 
  Clock, AlertTriangle, CheckCircle, User, MoreVertical
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { taskApi } from '../api/taskApi';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatWindow from '../components/messaging/ChatWindow';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, assigned_to_me, created_by_me
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal & Chat State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeChatTask, setActiveChatTask] = useState<any | null>(null);

  // Form State
  const [newTask, setNewTask] = useState({
      title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' 
  });

  useEffect(() => {
      fetchTasks();
  }, [filter, statusFilter]);

  const fetchTasks = async () => {
      setLoading(true);
      try {
          const data = await taskApi.getTasks({ filter: filter === 'all' ? '' : filter, status: statusFilter });
          setTasks(data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleCreateTask = async () => {
      try {
          await taskApi.createTask(newTask);
          toast.success("Tâche créée");
          setShowCreateModal(false);
          setNewTask({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' });
          fetchTasks();
      } catch (e) {
          toast.error("Erreur création");
      }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
      try {
          await taskApi.updateTask(id, { status: newStatus });
          toast.success("Statut mis à jour");
          fetchTasks();
      } catch (e) {
          toast.error("Erreur mise à jour");
      }
  };

  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
          case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
          case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
          default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex gap-6 overflow-hidden">
        {/* Left: Task List */}
        <div className="flex-1 flex flex-col h-full bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CheckSquare className="text-primary"/> Tâches
                    </h1>
                </div>
                <div className="flex gap-2">
                    <select 
                        className="text-sm border rounded-lg px-2 py-1.5 bg-white"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">Toutes les tâches</option>
                        <option value="assigned_to_me">Assignées à moi</option>
                        <option value="created_by_me">Créées par moi</option>
                    </select>
                    <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-2">
                        <Plus size={16}/> Nouvelle
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {tasks.map(task => (
                    <div 
                        key={task.id} 
                        className={`group p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer bg-white ${activeChatTask?.id === task.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        onClick={() => setActiveChatTask(task)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-start gap-3">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, task.status === 'done' ? 'todo' : 'done'); }}
                                    className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-primary'}`}
                                >
                                    {task.status === 'done' && <CheckCircle size={12}/>}
                                </button>
                                <div>
                                    <h3 className={`font-semibold ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pl-8 text-xs text-gray-400">
                             <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <User size={12}/> {task.assigned_name || 'Non assigné'}
                                </span>
                                {task.due_date && (
                                    <span className={`flex items-center gap-1 ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500 font-bold' : ''}`}>
                                        <Calendar size={12}/> {format(new Date(task.due_date), 'dd MMM')}
                                    </span>
                                )}
                             </div>
                             <div className="flex items-center gap-1 text-primary group-hover:opacity-100 opacity-0 transition-opacity">
                                 <MessageSquare size={12}/> Ouvrir chat
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right: Details / Chat */}
        <div className="w-[400px] xl:w-[500px] h-full">
            {activeChatTask ? (
                <ChatWindow 
                    contextType="task" 
                    contextId={activeChatTask.id} 
                    title={activeChatTask.title} 
                    onClose={() => setActiveChatTask(null)}
                />
            ) : (
                <div className="h-full bg-gray-50 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <MessageSquare size={48} className="mb-4 opacity-50"/>
                    <p className="font-medium">Sélectionnez une tâche pour voir les détails et discuter avec l'équipe.</p>
                </div>
            )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-lg p-6">
                    <h3 className="text-lg font-bold mb-4">Nouvelle Tâche</h3>
                    <div className="space-y-4">
                        <Input label="Titre" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="Ex: Relancer locataire X..." />
                        <Input label="Description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder="Détails de l'action..." />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Priorité</label>
                                <select className="w-full border rounded-lg p-2" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                                    <option value="low">Basse</option>
                                    <option value="medium">Moyenne</option>
                                    <option value="high">Haute</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>
                            <Input type="date" label="Échéance" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} />
                        </div>
                        {/* Assign to field would go here with a user selector */}
                        
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Annuler</Button>
                            <Button onClick={handleCreateTask}>Créer</Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
    </div>
  );
};

export default TasksPage;
