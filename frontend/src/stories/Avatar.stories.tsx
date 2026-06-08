import type { Meta, StoryObj } from '@storybook/react';
import Avatar from '../components/ui/Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs','sm','md','lg','xl'] },
    statusColor: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof Avatar>;

export const Initials: Story = {
  args: { name: 'Warisse Otchade', size: 'md' },
};

export const WithImage: Story = {
  args: { name: 'Warisse Otchade', imageUrl: 'https://i.pravatar.cc/150?img=12', size: 'md' },
};

export const WithStatusDot: Story = {
  args: { name: 'Amavi Koffi', size: 'md', statusColor: 'bg-green-500' },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4 p-4">
      {(['xs','sm','md','lg','xl'] as const).map(s => (
        <div key={s} className="flex flex-col items-center gap-1">
          <Avatar name="Amavi K." size={s} />
          <span className="text-xs text-gray-500">{s}</span>
        </div>
      ))}
    </div>
  ),
};

export const HashColors: Story = {
  render: () => (
    <div className="flex gap-3 p-4 flex-wrap">
      {['Alice B.','Bob C.','Carole D.','David E.','Elise F.','Frank G.','Grace H.'].map(n => (
        <div key={n} className="flex flex-col items-center gap-1">
          <Avatar name={n} size="md" />
          <span className="text-xs text-gray-500">{n.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  ),
};
