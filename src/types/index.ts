export interface Game {
	id: string;
	title: string;
	description: string;
	image: string;
	rating?: number;
	year?: number;
	duration?: string;
	genre?: string[];
	developer?: string;
	tags?: string[];
}

export interface NavItem {
	id: string;
	label: string;
	icon: string;
	path: string;
	badge?: string;
}

export interface SettingsSection {
	id: string;
	label: string;
	icon: string;
	badge?: string;
}

export interface CardProps {
	className?: string;
	children: React.ReactNode;
	onClick?: () => void;
	hoverable?: boolean;
	glowing?: boolean;
}

export interface ButtonProps {
	variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
	size?: 'sm' | 'md' | 'lg';
	children: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	loading?: boolean;
	icon?: React.ReactNode;
	iconPosition?: 'left' | 'right';
	fullWidth?: boolean;
	className?: string;
}

export interface ToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	label?: string;
	description?: string;
}

export interface InputProps {
	type?: 'text' | 'password' | 'email' | 'number' | 'search';
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
	icon?: React.ReactNode;
	disabled?: boolean;
	error?: string;
	label?: string;
	className?: string;
}

export interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface TooltipProps {
	content: string;
	children: React.ReactNode;
	position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface BadgeProps {
	variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
	size?: 'sm' | 'md';
	children: React.ReactNode;
}

export interface TabsProps {
	tabs: { id: string; label: string; icon?: React.ReactNode }[];
	activeTab: string;
	onChange: (tabId: string) => void;
}

export interface ProgressProps {
	value: number;
	max?: number;
	showLabel?: boolean;
	variant?: 'default' | 'success' | 'warning' | 'error';
	size?: 'sm' | 'md' | 'lg';
}

export interface AvatarProps {
	src?: string;
	alt?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	fallback?: string;
	status?: 'online' | 'offline' | 'away' | 'busy';
}

export interface DropdownItem {
	id: string;
	label: string;
	icon?: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	danger?: boolean;
}

export interface DropdownProps {
	trigger: React.ReactNode;
	items: DropdownItem[];
	align?: 'left' | 'right';
}
