import type { Meta, StoryObj } from '@storybook/react';
import Button from '../components/ui/Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary','secondary','success','warning','error','ghost','link'] },
    size:    { control: 'select', options: ['sm','md','lg'] },
    disabled:{ control: 'boolean' },
    loading: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story   = { args: { variant: 'primary',   children: 'Enregistrer' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Annuler' } };
export const Ghost: Story     = { args: { variant: 'ghost',     children: 'Voir plus' } };
export const Danger: Story    = { args: { variant: 'error',     children: 'Supprimer' } };
export const Loading: Story   = { args: { variant: 'primary',   children: 'En cours…', loading: true } };
export const Disabled: Story  = { args: { variant: 'primary',   children: 'Indisponible', disabled: true } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 p-4">
      {(['primary','secondary','success','warning','error','ghost','link'] as const).map(v => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
};
