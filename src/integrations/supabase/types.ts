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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients_cache: {
        Row: {
          benzo_keep_notes: string | null
          call_log: string | null
          client_bargained_rates: string | null
          client_handler: string | null
          client_location: string | null
          client_name: string | null
          comments: string | null
          company_name: string | null
          contact_no: string | null
          current_country: string | null
          description: string | null
          email: string | null
          event_city: string | null
          event_date_ad: string | null
          event_day: string | null
          event_location: string | null
          event_month: string | null
          event_year: string | null
          events: string | null
          final_quotation: string | null
          inquiry_date_ad: string | null
          inquiry_date_bs: string | null
          inquiry_time: string | null
          last_activity_log: string | null
          mindset: string | null
          our_bargained_rates: string | null
          payment_dates_ad: string | null
          payments_made: string | null
          priority: string | null
          quotation_data: string | null
          registered_date_bs: string | null
          registered_date_time_ad: string
          remaining_payment: string | null
          row_number: number | null
          service_types: string | null
          sheet_source: string
          source: string | null
          status_log: string | null
          synced_to_sheet: boolean | null
          updated_at: string | null
          whatsapp_no: string | null
          who_added: string | null
        }
        Insert: {
          benzo_keep_notes?: string | null
          call_log?: string | null
          client_bargained_rates?: string | null
          client_handler?: string | null
          client_location?: string | null
          client_name?: string | null
          comments?: string | null
          company_name?: string | null
          contact_no?: string | null
          current_country?: string | null
          description?: string | null
          email?: string | null
          event_city?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_location?: string | null
          event_month?: string | null
          event_year?: string | null
          events?: string | null
          final_quotation?: string | null
          inquiry_date_ad?: string | null
          inquiry_date_bs?: string | null
          inquiry_time?: string | null
          last_activity_log?: string | null
          mindset?: string | null
          our_bargained_rates?: string | null
          payment_dates_ad?: string | null
          payments_made?: string | null
          priority?: string | null
          quotation_data?: string | null
          registered_date_bs?: string | null
          registered_date_time_ad: string
          remaining_payment?: string | null
          row_number?: number | null
          service_types?: string | null
          sheet_source?: string
          source?: string | null
          status_log?: string | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          whatsapp_no?: string | null
          who_added?: string | null
        }
        Update: {
          benzo_keep_notes?: string | null
          call_log?: string | null
          client_bargained_rates?: string | null
          client_handler?: string | null
          client_location?: string | null
          client_name?: string | null
          comments?: string | null
          company_name?: string | null
          contact_no?: string | null
          current_country?: string | null
          description?: string | null
          email?: string | null
          event_city?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_location?: string | null
          event_month?: string | null
          event_year?: string | null
          events?: string | null
          final_quotation?: string | null
          inquiry_date_ad?: string | null
          inquiry_date_bs?: string | null
          inquiry_time?: string | null
          last_activity_log?: string | null
          mindset?: string | null
          our_bargained_rates?: string | null
          payment_dates_ad?: string | null
          payments_made?: string | null
          priority?: string | null
          quotation_data?: string | null
          registered_date_bs?: string | null
          registered_date_time_ad?: string
          remaining_payment?: string | null
          row_number?: number | null
          service_types?: string | null
          sheet_source?: string
          source?: string | null
          status_log?: string | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          whatsapp_no?: string | null
          who_added?: string | null
        }
        Relationships: []
      }
      contact_details_cache: {
        Row: {
          bride_backup_number: string | null
          bride_backup_number2: string | null
          bride_backup_relation: string | null
          bride_backup_relation2: string | null
          bride_contact_number: string | null
          bride_full_name: string | null
          bride_home_area: string | null
          bride_home_city: string | null
          bride_home_landmark: string | null
          bride_home_map: string | null
          bride_instagram: string | null
          bride_whatsapp_number: string | null
          client_name: string | null
          form_sent_date: string | null
          groom_backup_number: string | null
          groom_backup_number2: string | null
          groom_backup_relation: string | null
          groom_backup_relation2: string | null
          groom_contact_number: string | null
          groom_full_name: string | null
          groom_home_area: string | null
          groom_home_city: string | null
          groom_home_landmark: string | null
          groom_home_map: string | null
          groom_instagram: string | null
          groom_whatsapp_number: string | null
          registered_date_bs: string | null
          registered_date_time_ad: string
          row_number: number | null
          synced_to_sheet: boolean | null
          updated_at: string | null
        }
        Insert: {
          bride_backup_number?: string | null
          bride_backup_number2?: string | null
          bride_backup_relation?: string | null
          bride_backup_relation2?: string | null
          bride_contact_number?: string | null
          bride_full_name?: string | null
          bride_home_area?: string | null
          bride_home_city?: string | null
          bride_home_landmark?: string | null
          bride_home_map?: string | null
          bride_instagram?: string | null
          bride_whatsapp_number?: string | null
          client_name?: string | null
          form_sent_date?: string | null
          groom_backup_number?: string | null
          groom_backup_number2?: string | null
          groom_backup_relation?: string | null
          groom_backup_relation2?: string | null
          groom_contact_number?: string | null
          groom_full_name?: string | null
          groom_home_area?: string | null
          groom_home_city?: string | null
          groom_home_landmark?: string | null
          groom_home_map?: string | null
          groom_instagram?: string | null
          groom_whatsapp_number?: string | null
          registered_date_bs?: string | null
          registered_date_time_ad: string
          row_number?: number | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
        }
        Update: {
          bride_backup_number?: string | null
          bride_backup_number2?: string | null
          bride_backup_relation?: string | null
          bride_backup_relation2?: string | null
          bride_contact_number?: string | null
          bride_full_name?: string | null
          bride_home_area?: string | null
          bride_home_city?: string | null
          bride_home_landmark?: string | null
          bride_home_map?: string | null
          bride_instagram?: string | null
          bride_whatsapp_number?: string | null
          client_name?: string | null
          form_sent_date?: string | null
          groom_backup_number?: string | null
          groom_backup_number2?: string | null
          groom_backup_relation?: string | null
          groom_backup_relation2?: string | null
          groom_contact_number?: string | null
          groom_full_name?: string | null
          groom_home_area?: string | null
          groom_home_city?: string | null
          groom_home_landmark?: string | null
          groom_home_map?: string | null
          groom_instagram?: string | null
          groom_whatsapp_number?: string | null
          registered_date_bs?: string | null
          registered_date_time_ad?: string
          row_number?: number | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_details_cache: {
        Row: {
          do_groom_come_in_mehndi: string | null
          event_date_ad: string | null
          event_day: string | null
          event_demands: string | null
          event_end_time: string | null
          event_index: number
          event_month: string | null
          event_name: string | null
          event_references: string | null
          event_start_time: string | null
          event_year: string | null
          guest_count: string | null
          id: string
          parlour_area: string | null
          parlour_city: string | null
          parlour_end_time: string | null
          parlour_map: string | null
          parlour_name: string | null
          parlour_start_time: string | null
          parlour_type: string | null
          registered_date_time_ad: string
          synced_to_sheet: boolean | null
          updated_at: string | null
          venue_area: string | null
          venue_city: string | null
          venue_map: string | null
          venue_name: string | null
          venue_type: string | null
        }
        Insert: {
          do_groom_come_in_mehndi?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_demands?: string | null
          event_end_time?: string | null
          event_index?: number
          event_month?: string | null
          event_name?: string | null
          event_references?: string | null
          event_start_time?: string | null
          event_year?: string | null
          guest_count?: string | null
          id?: string
          parlour_area?: string | null
          parlour_city?: string | null
          parlour_end_time?: string | null
          parlour_map?: string | null
          parlour_name?: string | null
          parlour_start_time?: string | null
          parlour_type?: string | null
          registered_date_time_ad: string
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          venue_area?: string | null
          venue_city?: string | null
          venue_map?: string | null
          venue_name?: string | null
          venue_type?: string | null
        }
        Update: {
          do_groom_come_in_mehndi?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_demands?: string | null
          event_end_time?: string | null
          event_index?: number
          event_month?: string | null
          event_name?: string | null
          event_references?: string | null
          event_start_time?: string | null
          event_year?: string | null
          guest_count?: string | null
          id?: string
          parlour_area?: string | null
          parlour_city?: string | null
          parlour_end_time?: string | null
          parlour_map?: string | null
          parlour_name?: string | null
          parlour_start_time?: string | null
          parlour_type?: string | null
          registered_date_time_ad?: string
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          venue_area?: string | null
          venue_city?: string | null
          venue_map?: string | null
          venue_name?: string | null
          venue_type?: string | null
        }
        Relationships: []
      }
      freelancer_assignments: {
        Row: {
          assistant: string | null
          client_name: string | null
          drone_operator: string | null
          event: string
          event_date_ad: string | null
          event_day: string | null
          event_month: string | null
          event_year: string | null
          extra_photographer: string | null
          extra_videographer: string | null
          fpv_operator: string | null
          id: string
          iphone_shooter: string | null
          photographer_bride: string | null
          photographer_groom: string | null
          registered_date_bs: string | null
          registered_date_time_ad: string
          required_categories: string | null
          synced_to_sheet: boolean | null
          updated_at: string | null
          videographer_bride: string | null
          videographer_groom: string | null
        }
        Insert: {
          assistant?: string | null
          client_name?: string | null
          drone_operator?: string | null
          event: string
          event_date_ad?: string | null
          event_day?: string | null
          event_month?: string | null
          event_year?: string | null
          extra_photographer?: string | null
          extra_videographer?: string | null
          fpv_operator?: string | null
          id?: string
          iphone_shooter?: string | null
          photographer_bride?: string | null
          photographer_groom?: string | null
          registered_date_bs?: string | null
          registered_date_time_ad: string
          required_categories?: string | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          videographer_bride?: string | null
          videographer_groom?: string | null
        }
        Update: {
          assistant?: string | null
          client_name?: string | null
          drone_operator?: string | null
          event?: string
          event_date_ad?: string | null
          event_day?: string | null
          event_month?: string | null
          event_year?: string | null
          extra_photographer?: string | null
          extra_videographer?: string | null
          fpv_operator?: string | null
          id?: string
          iphone_shooter?: string | null
          photographer_bride?: string | null
          photographer_groom?: string | null
          registered_date_bs?: string | null
          registered_date_time_ad?: string
          required_categories?: string | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          videographer_bride?: string | null
          videographer_groom?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
