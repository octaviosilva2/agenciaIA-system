export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts_payable: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["payable_category"]
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          project_id: string | null
          source_charge_id: string | null
          status: Database["public"]["Enums"]["charge_status"]
          supplier: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["payable_category"]
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          source_charge_id?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["payable_category"]
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          source_charge_id?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_source_charge_id_fkey"
            columns: ["source_charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          deal_id: string | null
          id: string
          occurred_at: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          occurred_at?: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          occurred_at?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          amount: number
          company_id: string | null
          contract_id: string | null
          created_at: string
          description: string
          due_date: string
          hours: number | null
          id: string
          kind: Database["public"]["Enums"]["charge_kind"]
          method: Database["public"]["Enums"]["charge_method"] | null
          notes: string | null
          paid_at: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["charge_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          contract_id?: string | null
          created_at?: string
          description: string
          due_date: string
          hours?: number | null
          id?: string
          kind: Database["public"]["Enums"]["charge_kind"]
          method?: Database["public"]["Enums"]["charge_method"] | null
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          hours?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["charge_kind"]
          method?: Database["public"]["Enums"]["charge_method"] | null
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_checkins: {
        Row: {
          author_id: string | null
          comment: string | null
          commitment_id: string
          confidence: Database["public"]["Enums"]["confidence_level"]
          created_at: string
          id: string
          progress: number
        }
        Insert: {
          author_id?: string | null
          comment?: string | null
          commitment_id: string
          confidence: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          id?: string
          progress: number
        }
        Update: {
          author_id?: string | null
          comment?: string | null
          commitment_id?: string
          confidence?: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          id?: string
          progress?: number
        }
        Relationships: [
          {
            foreignKeyName: "commitment_checkins_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_checkins_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          confidence: Database["public"]["Enums"]["confidence_level"]
          created_at: string
          description: string | null
          dri_id: string | null
          id: string
          metric_target: string | null
          narrative_id: string
          progress: number
          status: Database["public"]["Enums"]["commitment_status"]
          title: string
          type: Database["public"]["Enums"]["commitment_type"]
          updated_at: string
        }
        Insert: {
          confidence?: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          description?: string | null
          dri_id?: string | null
          id?: string
          metric_target?: string | null
          narrative_id: string
          progress?: number
          status?: Database["public"]["Enums"]["commitment_status"]
          title: string
          type: Database["public"]["Enums"]["commitment_type"]
          updated_at?: string
        }
        Update: {
          confidence?: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          description?: string | null
          dri_id?: string | null
          id?: string
          metric_target?: string | null
          narrative_id?: string
          progress?: number
          status?: Database["public"]["Enums"]["commitment_status"]
          title?: string
          type?: Database["public"]["Enums"]["commitment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_dri_id_fkey"
            columns: ["dri_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_narrative_id_fkey"
            columns: ["narrative_id"]
            isOneToOne: false
            referencedRelation: "narratives"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          archived_at: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          origin: string | null
          owner_id: string | null
          segment: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          origin?: string | null
          owner_id?: string | null
          segment?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          origin?: string | null
          owner_id?: string | null
          segment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          archived_at: string | null
          billing_day: number | null
          company_id: string
          contact_frequency_days: number | null
          created_at: string
          hourly_rate: number | null
          id: string
          kind: Database["public"]["Enums"]["contract_kind"]
          min_months: number | null
          monthly_value: number | null
          name: string
          next_contact_date: string | null
          notes: string | null
          project_id: string | null
          sla: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          billing_day?: number | null
          company_id: string
          contact_frequency_days?: number | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          kind: Database["public"]["Enums"]["contract_kind"]
          min_months?: number | null
          monthly_value?: number | null
          name: string
          next_contact_date?: string | null
          notes?: string | null
          project_id?: string | null
          sla?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          billing_day?: number | null
          company_id?: string
          contact_frequency_days?: number | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["contract_kind"]
          min_months?: number | null
          monthly_value?: number | null
          name?: string
          next_contact_date?: string | null
          notes?: string | null
          project_id?: string | null
          sla?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_events: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string
          entered_at: string
          id: string
          stage: Database["public"]["Enums"]["deal_stage"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id: string
          entered_at?: string
          id?: string
          stage: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string
          entered_at?: string
          id?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          archived_at: string | null
          budget: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          decision_maker: string | null
          estimated_value: number | null
          has_maintenance: boolean | null
          id: string
          lost_reason: string | null
          next_action: string | null
          next_action_date: string | null
          owner_id: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["deal_urgency"] | null
        }
        Insert: {
          archived_at?: string | null
          budget?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          decision_maker?: string | null
          estimated_value?: number | null
          has_maintenance?: boolean | null
          id?: string
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          owner_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["deal_urgency"] | null
        }
        Update: {
          archived_at?: string | null
          budget?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          decision_maker?: string | null
          estimated_value?: number | null
          has_maintenance?: boolean | null
          id?: string
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          owner_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["deal_urgency"] | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          company_id: string
          context: string | null
          created_at: string
          deal_id: string | null
          id: string
          notes: string | null
          opportunities: string | null
          problems: string | null
          proposed_solution: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          context?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          notes?: string | null
          opportunities?: string | null
          problems?: string | null
          proposed_solution?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          context?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          notes?: string | null
          opportunities?: string | null
          problems?: string | null
          proposed_solution?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostics_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      narratives: {
        Row: {
          created_at: string
          dri_id: string | null
          id: string
          purpose: string | null
          status: Database["public"]["Enums"]["narrative_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dri_id?: string | null
          id?: string
          purpose?: string | null
          status?: Database["public"]["Enums"]["narrative_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dri_id?: string | null
          id?: string
          purpose?: string | null
          status?: Database["public"]["Enums"]["narrative_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "narratives_dri_id_fkey"
            columns: ["dri_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          created_at: string
          id: string
          stale_deal_days: number
          tax_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          stale_deal_days?: number
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          stale_deal_days?: number
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_stage_events: {
        Row: {
          created_at: string
          entered_at: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entered_at?: string
          id?: string
          project_id: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entered_at?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: string
          created_at: string
          custom_stages: Json | null
          deal_id: string | null
          drive_url: string | null
          due_date: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          progress: number
          scope_items: Json
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          total_value: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_stages?: Json | null
          deal_id?: string | null
          drive_url?: string | null
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          progress?: number
          scope_items?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_stages?: Json | null
          deal_id?: string | null
          drive_url?: string | null
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          progress?: number
          scope_items?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["strategy_block_kind"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["strategy_block_kind"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["strategy_block_kind"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_blocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          area: Database["public"]["Enums"]["task_area"]
          assignee_id: string | null
          commitment_id: string | null
          company_id: string | null
          contract_id: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          due_date: string | null
          effort: Database["public"]["Enums"]["level_scale"] | null
          id: string
          impact: Database["public"]["Enums"]["level_scale"] | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence: Database["public"]["Enums"]["task_recurrence"]
          recurrence_day: number | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          area: Database["public"]["Enums"]["task_area"]
          assignee_id?: string | null
          commitment_id?: string | null
          company_id?: string | null
          contract_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          effort?: Database["public"]["Enums"]["level_scale"] | null
          id?: string
          impact?: Database["public"]["Enums"]["level_scale"] | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          recurrence_day?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          area?: Database["public"]["Enums"]["task_area"]
          assignee_id?: string | null
          commitment_id?: string | null
          company_id?: string | null
          contract_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          effort?: Database["public"]["Enums"]["level_scale"] | null
          id?: string
          impact?: Database["public"]["Enums"]["level_scale"] | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          recurrence_day?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_commitment"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_type:
        | "nota"
        | "reuniao"
        | "ligacao"
        | "email"
        | "whatsapp"
        | "outro"
      charge_kind: "setup" | "recorrencia" | "avulso"
      charge_method: "pix" | "boleto" | "cartao" | "transferencia" | "outro"
      charge_status: "pendente" | "pago" | "cancelado"
      commitment_status: "em_andamento" | "cumprido" | "nao_cumprido"
      commitment_type: "think_it" | "build_it" | "launch_it" | "quantitativo"
      confidence_level: "baixa" | "media" | "alta"
      contract_kind: "mensal" | "avulso"
      contract_status: "ativo" | "encerrado"
      deal_stage:
        | "prospect"
        | "lead"
        | "diagnostico"
        | "oportunidade"
        | "escopo"
        | "proposta"
        | "negociacao"
        | "fechado"
        | "perdido"
        | "reativar_futuramente"
        | "desqualificado"
      deal_urgency: "baixa" | "media" | "alta"
      level_scale: "baixo" | "medio" | "alto"
      narrative_status: "ativa" | "concluida" | "arquivada"
      payable_category: "fixo" | "variavel" | "imposto"
      project_status:
        | "a_iniciar"
        | "briefing"
        | "desenvolvimento"
        | "revisao"
        | "entregue"
      strategy_block_kind:
        | "missao"
        | "proposito"
        | "swot"
        | "asis_tobe"
        | "blueprint"
      task_area:
        | "gestao"
        | "comercial"
        | "operacional"
        | "financeiro"
        | "sistema"
      task_priority: "urgente" | "proximo" | "futuro"
      task_recurrence: "none" | "monthly"
      task_status: "analisar" | "todo" | "doing" | "impedimento" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: ["nota", "reuniao", "ligacao", "email", "whatsapp", "outro"],
      charge_kind: ["setup", "recorrencia", "avulso"],
      charge_method: ["pix", "boleto", "cartao", "transferencia", "outro"],
      charge_status: ["pendente", "pago", "cancelado"],
      commitment_status: ["em_andamento", "cumprido", "nao_cumprido"],
      commitment_type: ["think_it", "build_it", "launch_it", "quantitativo"],
      confidence_level: ["baixa", "media", "alta"],
      contract_kind: ["mensal", "avulso"],
      contract_status: ["ativo", "encerrado"],
      deal_stage: ["prospect", "lead", "diagnostico", "oportunidade", "escopo", "proposta", "negociacao", "fechado", "perdido", "reativar_futuramente", "desqualificado"],
      deal_urgency: ["baixa", "media", "alta"],
      level_scale: ["baixo", "medio", "alto"],
      narrative_status: ["ativa", "concluida", "arquivada"],
      payable_category: ["fixo", "variavel", "imposto"],
      project_status: ["a_iniciar", "briefing", "desenvolvimento", "revisao", "entregue"],
      strategy_block_kind: ["missao", "proposito", "swot", "asis_tobe", "blueprint"],
      task_area: ["gestao", "comercial", "operacional", "financeiro", "sistema"],
      task_priority: ["urgente", "proximo", "futuro"],
      task_recurrence: ["none", "monthly"],
      task_status: ["analisar", "todo", "doing", "impedimento", "done"],
    },
  },
} as const
