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
      album_types: {
        Row: {
          created_at: string
          id: string
          type_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          type_name: string
        }
        Update: {
          created_at?: string
          id?: string
          type_name?: string
        }
        Relationships: []
      }
      client_deliverables: {
        Row: {
          album_name: string
          deliverable_type: string
          enabled: boolean
          event_name: string
          id: string
          item_names: string
          photographer_notes: string
          photographer_toggles: string
          quantity: number
          registered_date_time_ad: string
          section: string
          synced_to_sheet: boolean
          updated_at: string
        }
        Insert: {
          album_name?: string
          deliverable_type: string
          enabled?: boolean
          event_name: string
          id?: string
          item_names?: string
          photographer_notes?: string
          photographer_toggles?: string
          quantity?: number
          registered_date_time_ad: string
          section: string
          synced_to_sheet?: boolean
          updated_at?: string
        }
        Update: {
          album_name?: string
          deliverable_type?: string
          enabled?: boolean
          event_name?: string
          id?: string
          item_names?: string
          photographer_notes?: string
          photographer_toggles?: string
          quantity?: number
          registered_date_time_ad?: string
          section?: string
          synced_to_sheet?: boolean
          updated_at?: string
        }
        Relationships: []
      }
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
      dropdowns_cache: {
        Row: {
          category: string
          id: string
          updated_at: string | null
          values_json: string | null
        }
        Insert: {
          category: string
          id?: string
          updated_at?: string | null
          values_json?: string | null
        }
        Update: {
          category?: string
          id?: string
          updated_at?: string | null
          values_json?: string | null
        }
        Relationships: []
      }
      edited_files: {
        Row: {
          client_name: string
          created_at: string
          event_name: string
          file_name: string
          file_path: string
          file_size_bytes: number
          file_type: string
          folder_event_name: string
          id: string
          mime_type: string
          pcloud_file_id: number | null
          photographer_name: string
          registered_date_time_ad: string
          side_folder: string
          storage_path: string
          storage_type: string
          updated_at: string
          upload_progress: number
          upload_status: string
        }
        Insert: {
          client_name?: string
          created_at?: string
          event_name?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          file_type?: string
          folder_event_name?: string
          id?: string
          mime_type?: string
          pcloud_file_id?: number | null
          photographer_name?: string
          registered_date_time_ad: string
          side_folder?: string
          storage_path?: string
          storage_type?: string
          updated_at?: string
          upload_progress?: number
          upload_status?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          event_name?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          file_type?: string
          folder_event_name?: string
          id?: string
          mime_type?: string
          pcloud_file_id?: number | null
          photographer_name?: string
          registered_date_time_ad?: string
          side_folder?: string
          storage_path?: string
          storage_type?: string
          updated_at?: string
          upload_progress?: number
          upload_status?: string
        }
        Relationships: []
      }
      edited_files_links: {
        Row: {
          client_name: string
          created_at: string
          id: string
          link_title: string
          link_type: string
          link_url: string
          notes: string
          registered_date_time_ad: string
          updated_at: string
        }
        Insert: {
          client_name?: string
          created_at?: string
          id?: string
          link_title?: string
          link_type?: string
          link_url?: string
          notes?: string
          registered_date_time_ad: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          link_title?: string
          link_type?: string
          link_url?: string
          notes?: string
          registered_date_time_ad?: string
          updated_at?: string
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
      files_management: {
        Row: {
          backup_1_device_name: string | null
          backup_1_recorded_at: string | null
          backup_2_device_name: string | null
          backup_2_path: string | null
          backup_2_recorded_at: string | null
          backup_3_device_name: string | null
          backup_3_path: string | null
          backup_3_recorded_at: string | null
          backup_history: string | null
          card_label: string | null
          category: string | null
          client_folder_name: string | null
          client_name: string | null
          confirmed: boolean | null
          created_at: string
          deleted_or_not: boolean | null
          double_backup: boolean | null
          double_backup_path: string | null
          drive_link: string | null
          drive_upload: boolean | null
          drive_upload_path: string | null
          event_date_ad: string | null
          event_day: string | null
          event_folder_name: string | null
          event_month: string | null
          event_name: string | null
          event_year: string | null
          final_generated_path: string | null
          format_type: string | null
          freelancer_name: string | null
          freelancer_type: string | null
          id: string
          notes: string | null
          number_of_items: number | null
          reconfirmation: boolean | null
          registered_date_bs: string | null
          registered_date_time_ad: string
          side: string | null
          size_gb: number | null
          storage_device_id: string | null
          storage_type: string | null
          synced_to_sheet: boolean | null
          triple_backup: boolean | null
          triple_backup_path: string | null
          updated_at: string
          who_copied: string | null
          year_event_folder: string | null
        }
        Insert: {
          backup_1_device_name?: string | null
          backup_1_recorded_at?: string | null
          backup_2_device_name?: string | null
          backup_2_path?: string | null
          backup_2_recorded_at?: string | null
          backup_3_device_name?: string | null
          backup_3_path?: string | null
          backup_3_recorded_at?: string | null
          backup_history?: string | null
          card_label?: string | null
          category?: string | null
          client_folder_name?: string | null
          client_name?: string | null
          confirmed?: boolean | null
          created_at?: string
          deleted_or_not?: boolean | null
          double_backup?: boolean | null
          double_backup_path?: string | null
          drive_link?: string | null
          drive_upload?: boolean | null
          drive_upload_path?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_folder_name?: string | null
          event_month?: string | null
          event_name?: string | null
          event_year?: string | null
          final_generated_path?: string | null
          format_type?: string | null
          freelancer_name?: string | null
          freelancer_type?: string | null
          id?: string
          notes?: string | null
          number_of_items?: number | null
          reconfirmation?: boolean | null
          registered_date_bs?: string | null
          registered_date_time_ad?: string
          side?: string | null
          size_gb?: number | null
          storage_device_id?: string | null
          storage_type?: string | null
          synced_to_sheet?: boolean | null
          triple_backup?: boolean | null
          triple_backup_path?: string | null
          updated_at?: string
          who_copied?: string | null
          year_event_folder?: string | null
        }
        Update: {
          backup_1_device_name?: string | null
          backup_1_recorded_at?: string | null
          backup_2_device_name?: string | null
          backup_2_path?: string | null
          backup_2_recorded_at?: string | null
          backup_3_device_name?: string | null
          backup_3_path?: string | null
          backup_3_recorded_at?: string | null
          backup_history?: string | null
          card_label?: string | null
          category?: string | null
          client_folder_name?: string | null
          client_name?: string | null
          confirmed?: boolean | null
          created_at?: string
          deleted_or_not?: boolean | null
          double_backup?: boolean | null
          double_backup_path?: string | null
          drive_link?: string | null
          drive_upload?: boolean | null
          drive_upload_path?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_folder_name?: string | null
          event_month?: string | null
          event_name?: string | null
          event_year?: string | null
          final_generated_path?: string | null
          format_type?: string | null
          freelancer_name?: string | null
          freelancer_type?: string | null
          id?: string
          notes?: string | null
          number_of_items?: number | null
          reconfirmation?: boolean | null
          registered_date_bs?: string | null
          registered_date_time_ad?: string
          side?: string | null
          size_gb?: number | null
          storage_device_id?: string | null
          storage_type?: string | null
          synced_to_sheet?: boolean | null
          triple_backup?: boolean | null
          triple_backup_path?: string | null
          updated_at?: string
          who_copied?: string | null
          year_event_folder?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_management_storage_device_id_fkey"
            columns: ["storage_device_id"]
            isOneToOne: false
            referencedRelation: "storage_devices"
            referencedColumns: ["id"]
          },
        ]
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
      freelancer_event_settings: {
        Row: {
          event_name: string
          freelancer_name: string
          id: string
          personal_note: string | null
          registered_date_time_ad: string
          role_code: string
          show_bride_details: boolean
          show_bride_location: boolean
          show_groom_details: boolean
          show_groom_location: boolean
          show_parlour_details: boolean
          show_venue_details: boolean
          updated_at: string | null
        }
        Insert: {
          event_name: string
          freelancer_name: string
          id?: string
          personal_note?: string | null
          registered_date_time_ad: string
          role_code?: string
          show_bride_details?: boolean
          show_bride_location?: boolean
          show_groom_details?: boolean
          show_groom_location?: boolean
          show_parlour_details?: boolean
          show_venue_details?: boolean
          updated_at?: string | null
        }
        Update: {
          event_name?: string
          freelancer_name?: string
          id?: string
          personal_note?: string | null
          registered_date_time_ad?: string
          role_code?: string
          show_bride_details?: boolean
          show_bride_location?: boolean
          show_groom_details?: boolean
          show_groom_location?: boolean
          show_parlour_details?: boolean
          show_venue_details?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      freelancers_cache: {
        Row: {
          area: string | null
          city: string | null
          contact_no: string | null
          drone_operator: string | null
          facebook: string | null
          fpv_operator: string | null
          hybrid_editor: string | null
          hybrid_shooter: string | null
          id: string
          instagram: string | null
          iphone_shooter: string | null
          main_job: string | null
          map_link: string | null
          name: string | null
          pathao_landmark: string | null
          photo_editor: string | null
          photographer: string | null
          row_number: number | null
          synced_to_sheet: boolean | null
          updated_at: string | null
          video_editor: string | null
          videographer: string | null
          whatsapp_no: string | null
        }
        Insert: {
          area?: string | null
          city?: string | null
          contact_no?: string | null
          drone_operator?: string | null
          facebook?: string | null
          fpv_operator?: string | null
          hybrid_editor?: string | null
          hybrid_shooter?: string | null
          id?: string
          instagram?: string | null
          iphone_shooter?: string | null
          main_job?: string | null
          map_link?: string | null
          name?: string | null
          pathao_landmark?: string | null
          photo_editor?: string | null
          photographer?: string | null
          row_number?: number | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          video_editor?: string | null
          videographer?: string | null
          whatsapp_no?: string | null
        }
        Update: {
          area?: string | null
          city?: string | null
          contact_no?: string | null
          drone_operator?: string | null
          facebook?: string | null
          fpv_operator?: string | null
          hybrid_editor?: string | null
          hybrid_shooter?: string | null
          id?: string
          instagram?: string | null
          iphone_shooter?: string | null
          main_job?: string | null
          map_link?: string | null
          name?: string | null
          pathao_landmark?: string | null
          photo_editor?: string | null
          photographer?: string | null
          row_number?: number | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          video_editor?: string | null
          videographer?: string | null
          whatsapp_no?: string | null
        }
        Relationships: []
      }
      lagan_dates: {
        Row: {
          bs_day: number
          bs_month: number
          bs_year: number
          created_at: string
          id: string
        }
        Insert: {
          bs_day: number
          bs_month: number
          bs_year: number
          created_at?: string
          id?: string
        }
        Update: {
          bs_day?: number
          bs_month?: number
          bs_year?: number
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      logistics_types_cache: {
        Row: {
          category: string
          id: string
          type_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          id?: string
          type_name?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          id?: string
          type_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      logistics_vendors_cache: {
        Row: {
          area: string | null
          city: string | null
          company_contact: string | null
          company_whatsapp: string | null
          facebook: string | null
          gmail: string | null
          google_map: string | null
          id: string
          instagram: string | null
          name: string | null
          owner1: string | null
          owner1_contact: string | null
          owner1_whatsapp: string | null
          owner2: string | null
          owner2_contact: string | null
          owner2_whatsapp: string | null
          rating: string | null
          row_number: number | null
          synced_to_sheet: boolean | null
          tiktok: string | null
          updated_at: string | null
          vendor_category: string
          vendor_type: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          area?: string | null
          city?: string | null
          company_contact?: string | null
          company_whatsapp?: string | null
          facebook?: string | null
          gmail?: string | null
          google_map?: string | null
          id?: string
          instagram?: string | null
          name?: string | null
          owner1?: string | null
          owner1_contact?: string | null
          owner1_whatsapp?: string | null
          owner2?: string | null
          owner2_contact?: string | null
          owner2_whatsapp?: string | null
          rating?: string | null
          row_number?: number | null
          synced_to_sheet?: boolean | null
          tiktok?: string | null
          updated_at?: string | null
          vendor_category?: string
          vendor_type?: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          area?: string | null
          city?: string | null
          company_contact?: string | null
          company_whatsapp?: string | null
          facebook?: string | null
          gmail?: string | null
          google_map?: string | null
          id?: string
          instagram?: string | null
          name?: string | null
          owner1?: string | null
          owner1_contact?: string | null
          owner1_whatsapp?: string | null
          owner2?: string | null
          owner2_contact?: string | null
          owner2_whatsapp?: string | null
          rating?: string | null
          row_number?: number | null
          synced_to_sheet?: boolean | null
          tiktok?: string | null
          updated_at?: string | null
          vendor_category?: string
          vendor_type?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      potential_deletes: {
        Row: {
          approved_by: string
          client_name: string | null
          comments: string
          created_at: string | null
          delete_approval: string
          deleted: boolean | null
          device_name: string
          device_type: string
          id: string
          image_url: string
          notes: string | null
          permanently_deleted_at: string | null
          responsibility: string | null
          size_gb: number
        }
        Insert: {
          approved_by?: string
          client_name?: string | null
          comments?: string
          created_at?: string | null
          delete_approval?: string
          deleted?: boolean | null
          device_name?: string
          device_type?: string
          id?: string
          image_url: string
          notes?: string | null
          permanently_deleted_at?: string | null
          responsibility?: string | null
          size_gb?: number
        }
        Update: {
          approved_by?: string
          client_name?: string | null
          comments?: string
          created_at?: string | null
          delete_approval?: string
          deleted?: boolean | null
          device_name?: string
          device_type?: string
          id?: string
          image_url?: string
          notes?: string | null
          permanently_deleted_at?: string | null
          responsibility?: string | null
          size_gb?: number
        }
        Relationships: []
      }
      storage_devices: {
        Row: {
          cloud_type: string | null
          created_at: string
          device_name: string
          device_type: string
          expiry_date_ad: string | null
          health_percent: number
          id: string
          pc_drive_letter: string | null
          price_npr: number | null
          purchase_date_ad: string | null
          purchase_date_bs: string | null
          purchased_from: string | null
          remaining_storage_gb: number | null
          safety_status: string
          speed_rating: number
          synced_to_sheet: boolean | null
          total_storage_gb: number
          updated_at: string
          used_storage_gb: number
        }
        Insert: {
          cloud_type?: string | null
          created_at?: string
          device_name?: string
          device_type?: string
          expiry_date_ad?: string | null
          health_percent?: number
          id?: string
          pc_drive_letter?: string | null
          price_npr?: number | null
          purchase_date_ad?: string | null
          purchase_date_bs?: string | null
          purchased_from?: string | null
          remaining_storage_gb?: number | null
          safety_status?: string
          speed_rating?: number
          synced_to_sheet?: boolean | null
          total_storage_gb?: number
          updated_at?: string
          used_storage_gb?: number
        }
        Update: {
          cloud_type?: string | null
          created_at?: string
          device_name?: string
          device_type?: string
          expiry_date_ad?: string | null
          health_percent?: number
          id?: string
          pc_drive_letter?: string | null
          price_npr?: number | null
          purchase_date_ad?: string | null
          purchase_date_bs?: string | null
          purchased_from?: string | null
          remaining_storage_gb?: number | null
          safety_status?: string
          speed_rating?: number
          synced_to_sheet?: boolean | null
          total_storage_gb?: number
          updated_at?: string
          used_storage_gb?: number
        }
        Relationships: []
      }
      vendors_cache: {
        Row: {
          area: string | null
          city: string | null
          company_contact_no: string | null
          email: string | null
          facebook_link: string | null
          google_map_link: string | null
          id: string
          instagram_link: string | null
          owner1_contact_no: string | null
          owner1_name: string | null
          owner1_whatsapp_no: string | null
          owner2_contact_no: string | null
          owner2_name: string | null
          owner2_whatsapp_no: string | null
          row_number: number | null
          synced_to_sheet: boolean | null
          tiktok_link: string | null
          updated_at: string | null
          vendor_name: string | null
          vendor_type: string | null
          website_link: string | null
          youtube_link: string | null
        }
        Insert: {
          area?: string | null
          city?: string | null
          company_contact_no?: string | null
          email?: string | null
          facebook_link?: string | null
          google_map_link?: string | null
          id?: string
          instagram_link?: string | null
          owner1_contact_no?: string | null
          owner1_name?: string | null
          owner1_whatsapp_no?: string | null
          owner2_contact_no?: string | null
          owner2_name?: string | null
          owner2_whatsapp_no?: string | null
          row_number?: number | null
          synced_to_sheet?: boolean | null
          tiktok_link?: string | null
          updated_at?: string | null
          vendor_name?: string | null
          vendor_type?: string | null
          website_link?: string | null
          youtube_link?: string | null
        }
        Update: {
          area?: string | null
          city?: string | null
          company_contact_no?: string | null
          email?: string | null
          facebook_link?: string | null
          google_map_link?: string | null
          id?: string
          instagram_link?: string | null
          owner1_contact_no?: string | null
          owner1_name?: string | null
          owner1_whatsapp_no?: string | null
          owner2_contact_no?: string | null
          owner2_name?: string | null
          owner2_whatsapp_no?: string | null
          row_number?: number | null
          synced_to_sheet?: boolean | null
          tiktok_link?: string | null
          updated_at?: string | null
          vendor_name?: string | null
          vendor_type?: string | null
          website_link?: string | null
          youtube_link?: string | null
        }
        Relationships: []
      }
      video_edit_tracker: {
        Row: {
          client_demand: string | null
          client_name: string | null
          company_notes: string | null
          created_at: string | null
          deadline: string | null
          deleted: boolean | null
          edit_started_at: string | null
          edit_type: string | null
          editor: string | null
          event_date_ad: string | null
          event_day: string | null
          event_month: string | null
          event_name: string | null
          event_year: string | null
          force_split: boolean
          id: string
          is_playing: boolean
          playing_since: string | null
          reference: string | null
          registered_date_bs: string | null
          registered_date_time_ad: string
          songs: string | null
          stage_history: string
          sub_event_name: string | null
          synced_to_sheet: boolean | null
          updated_at: string | null
          urgency: string | null
          video_edit_status: string | null
        }
        Insert: {
          client_demand?: string | null
          client_name?: string | null
          company_notes?: string | null
          created_at?: string | null
          deadline?: string | null
          deleted?: boolean | null
          edit_started_at?: string | null
          edit_type?: string | null
          editor?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_month?: string | null
          event_name?: string | null
          event_year?: string | null
          force_split?: boolean
          id?: string
          is_playing?: boolean
          playing_since?: string | null
          reference?: string | null
          registered_date_bs?: string | null
          registered_date_time_ad: string
          songs?: string | null
          stage_history?: string
          sub_event_name?: string | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          urgency?: string | null
          video_edit_status?: string | null
        }
        Update: {
          client_demand?: string | null
          client_name?: string | null
          company_notes?: string | null
          created_at?: string | null
          deadline?: string | null
          deleted?: boolean | null
          edit_started_at?: string | null
          edit_type?: string | null
          editor?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_month?: string | null
          event_name?: string | null
          event_year?: string | null
          force_split?: boolean
          id?: string
          is_playing?: boolean
          playing_since?: string | null
          reference?: string | null
          registered_date_bs?: string | null
          registered_date_time_ad?: string
          songs?: string | null
          stage_history?: string
          sub_event_name?: string | null
          synced_to_sheet?: boolean | null
          updated_at?: string | null
          urgency?: string | null
          video_edit_status?: string | null
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
