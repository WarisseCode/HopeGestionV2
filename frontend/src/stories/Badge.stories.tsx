import type { Meta, StoryObj } from '@storybook/react';
import Badge, { statusToVariant } from '../components/ui/Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['success','error','warning','info','neutral','ghost','primary','secondary'] },
    size:    { control: 'select', options: ['sm','md','lg'] },
    dot:     { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Success: Story = { args: { variant: 'success', children: 'Actif' } };
export const Error: Story   = { args: { variant: 'error',   children: 'En retard' } };
export const Warning: Story = { args: { variant: 'warning', children: 'En attente' } };
export const Info: Story    = { args: { variant: 'info',    children: 'Signé' } };
export const Neutral: Story = { args: { variant: 'neutral', children: 'Inactif' } };

export const WithDot: Story = { args: { variant: 'success', children: 'Connecté', dot: true } };
export const Small: Story   = { args: { variant: 'warning', children: 'Pending', size: 'sm' } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {(['success','error','warning','info','neutral','ghost','primary','secondary'] as const).map(v => (
        <Badge key={v} variant={v}>{v}</Badge>
      ))}
    </div>
  ),
};

export const StatusMapping: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {['actif','inactif','en_attente','retard','signe','expire','resilié'].map(s => (
        <Badge key={s} variant={statusToVariant(s)}>{s}</Badge>
      ))}
    </div>
  ),
};
