'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Compass,
  Target,
  CheckSquare,
  Users,
  Briefcase,
  BarChart3,
  Hammer,
  Wrench,
  DollarSign,
  Receipt,
  Settings,
  Hexagon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar'

/**
 * Constante única de navegação do sistema.
 * Ordem e agrupamento conforme 01-produto.md.
 */
const NAV_GROUPS = [
  {
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Estratégia', href: '/estrategia', icon: Compass },
      { title: 'NCT', href: '/nct', icon: Target },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { title: 'Contatos', href: '/contatos', icon: Users },
      { title: 'Projetos', href: '/projetos', icon: Briefcase },
      { title: 'Funil', href: '/funil', icon: BarChart3 },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { title: 'Implementação', href: '/implementacao', icon: Hammer },
      { title: 'Manutenção', href: '/manutencao', icon: Wrench },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { title: 'Visão Geral', href: '/financeiro', icon: DollarSign },
      { title: 'Contas', href: '/financeiro/contas', icon: Receipt },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Config', href: '/config', icon: Settings },
    ],
  },
]

/**
 * Verifica se uma rota está ativa.
 * Rotas raiz (/, /financeiro, /nct) casam exato; demais por prefixo.
 */
function isActive(pathname: string, href: string): boolean {
  // Rotas que devem casar exatamente (raiz ou que têm sub-rotas com paths próprios)
  const exactRoutes = ['/', '/financeiro', '/nct']
  if (exactRoutes.includes(href)) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(href + '/')
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-2 py-2">
        {/* expandido: logo + trigger | colapsado: só trigger centralizado */}
        <div className="flex h-9 items-center justify-between group-data-[collapsible=icon]:justify-center">
          <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Hexagon className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">CRM Agência</span>
          </Link>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group, i) => (
          <SidebarGroup key={i}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive(pathname, item.href)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
