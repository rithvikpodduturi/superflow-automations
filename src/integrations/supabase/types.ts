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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      endpoint_health_checks: {
        Row: {
          check_url: string | null
          created_at: string
          endpoint_id: string
          id: string
          interval_seconds: number
          is_active: boolean
          last_check_at: string | null
          last_response_time_ms: number | null
          last_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_url?: string | null
          created_at?: string
          endpoint_id: string
          id?: string
          interval_seconds?: number
          is_active?: boolean
          last_check_at?: string | null
          last_response_time_ms?: number | null
          last_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_url?: string | null
          created_at?: string
          endpoint_id?: string
          id?: string
          interval_seconds?: number
          is_active?: boolean
          last_check_at?: string | null
          last_response_time_ms?: number | null
          last_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endpoint_health_checks_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      forward_configs: {
        Row: {
          created_at: string
          custom_headers: Json
          endpoint_id: string
          forward_url: string
          id: string
          is_active: boolean
          max_retries: number
          retry_delay_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_headers?: Json
          endpoint_id: string
          forward_url: string
          id?: string
          is_active?: boolean
          max_retries?: number
          retry_delay_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_headers?: Json
          endpoint_id?: string
          forward_url?: string
          id?: string
          is_active?: boolean
          max_retries?: number
          retry_delay_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forward_configs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: true
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sheets_config: {
        Row: {
          auto_push: boolean
          created_at: string
          id: string
          is_active: boolean
          service_account_key: string
          sheet_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_push?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          service_account_key: string
          sheet_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_push?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          service_account_key?: string
          sheet_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_channels: {
        Row: {
          channel_name: string | null
          channel_type: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
          webhook_url: string
        }
        Insert: {
          channel_name?: string | null
          channel_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
          webhook_url: string
        }
        Update: {
          channel_name?: string | null
          channel_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smtp_configurations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          smtp_email: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_username: string
          updated_at: string
          use_tls: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          smtp_email: string
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_username: string
          updated_at?: string
          use_tls?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          smtp_email?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
          use_tls?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_limits: {
        Row: {
          ban_reason: string | null
          banned_at: string | null
          created_at: string
          id: string
          is_banned: boolean
          max_endpoints: number
          max_notification_channels: number
          max_webhooks_per_day: number
          max_webhooks_per_hour: number
          max_webhooks_per_month: number
          requests_per_minute: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          max_endpoints?: number
          max_notification_channels?: number
          max_webhooks_per_day?: number
          max_webhooks_per_hour?: number
          max_webhooks_per_month?: number
          requests_per_minute?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          max_endpoints?: number
          max_notification_channels?: number
          max_webhooks_per_day?: number
          max_webhooks_per_hour?: number
          max_webhooks_per_month?: number
          requests_per_minute?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          api_key: string | null
          created_at: string
          description: string | null
          endpoint_id: string
          folder: string | null
          id: string
          is_active: boolean
          name: string | null
          notify_on_receive: boolean
          response_body: string | null
          response_headers: Json | null
          response_status_code: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          description?: string | null
          endpoint_id: string
          folder?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          notify_on_receive?: boolean
          response_body?: string | null
          response_headers?: Json | null
          response_status_code?: number
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          description?: string | null
          endpoint_id?: string
          folder?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          notify_on_receive?: boolean
          response_body?: string | null
          response_headers?: Json | null
          response_status_code?: number
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_forwards: {
        Row: {
          attempts: number
          created_at: string
          endpoint_id: string
          forward_url: string
          id: string
          last_error: string | null
          last_response_body: string | null
          last_response_status: number | null
          max_retries: number
          next_retry_at: string | null
          response_time_ms: number | null
          status: string
          updated_at: string
          user_id: string
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          endpoint_id: string
          forward_url: string
          id?: string
          last_error?: string | null
          last_response_body?: string | null
          last_response_status?: number | null
          max_retries?: number
          next_retry_at?: string | null
          response_time_ms?: number | null
          status?: string
          updated_at?: string
          user_id: string
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          endpoint_id?: string
          forward_url?: string
          id?: string
          last_error?: string | null
          last_response_body?: string | null
          last_response_status?: number | null
          max_retries?: number
          next_retry_at?: string | null
          response_time_ms?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_forwards_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_forwards_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_transforms: {
        Row: {
          created_at: string
          endpoint_id: string
          execution_order: number
          id: string
          is_active: boolean
          name: string
          transform_config: Json
          transform_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint_id: string
          execution_order?: number
          id?: string
          is_active?: boolean
          name?: string
          transform_config?: Json
          transform_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint_id?: string
          execution_order?: number
          id?: string
          is_active?: boolean
          name?: string
          transform_config?: Json
          transform_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_transforms_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          body: Json | null
          content_type: string | null
          created_at: string
          headers: Json | null
          id: string
          method: string | null
          query_params: Json | null
          source_ip: string | null
          url_path: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          body?: Json | null
          content_type?: string | null
          created_at?: string
          headers?: Json | null
          id?: string
          method?: string | null
          query_params?: Json | null
          source_ip?: string | null
          url_path?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          body?: Json | null
          content_type?: string | null
          created_at?: string
          headers?: Json | null
          id?: string
          method?: string | null
          query_params?: Json | null
          source_ip?: string | null
          url_path?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_platform_analytics: {
        Args: { time_range_hours?: number }
        Returns: {
          avg_response_time_ms: number
          banned_users: number
          failed_forwards: number
          successful_forwards: number
          total_endpoints: number
          total_forwards: number
          total_users: number
          total_webhooks: number
          webhooks_in_range: number
        }[]
      }
      admin_get_user_stats: {
        Args: never
        Returns: {
          channel_count: number
          endpoint_count: number
          user_id: string
          webhook_count: number
          webhook_count_today: number
        }[]
      }
      admin_get_webhook_volume: {
        Args: { time_range_hours?: number }
        Returns: {
          bucket: string
          count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "manager" | "user"
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
      app_role: ["super_admin", "manager", "user"],
    },
  },
} as const
