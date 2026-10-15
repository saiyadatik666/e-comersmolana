export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          name_hindi: string
          description: string
          price: number
          compare_at_price: number | null
          category: string
          category_hindi: string
          in_stock: boolean
          stock_count: number
          image: string
          poster_image: string | null
          pack_size: string
          rating: number
          reviews_count: number
          benefits: string[] | null
          ingredients: string[] | null
          dosage: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          name_hindi: string
          description: string
          price: number
          compare_at_price?: number | null
          category: string
          category_hindi: string
          in_stock?: boolean
          stock_count?: number
          image: string
          poster_image?: string | null
          pack_size: string
          rating?: number
          reviews_count?: number
          benefits?: string[] | null
          ingredients?: string[] | null
          dosage?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_hindi?: string
          description?: string
          price?: number
          compare_at_price?: number | null
          category?: string
          category_hindi?: string
          in_stock?: boolean
          stock_count?: number
          image?: string
          poster_image?: string | null
          pack_size?: string
          rating?: number
          reviews_count?: number
          benefits?: string[] | null
          ingredients?: string[] | null
          dosage?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          address_line: string
          landmark: string | null
          city_village: string
          state: string
          pincode: string
          country: string
          subtotal: number
          shipping_charge: number
          discount: number
          total: number
          payment_method: string
          payment_status: string
          order_status: string
          tracking_number: string | null
          notes: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          address_line: string
          landmark?: string | null
          city_village: string
          state: string
          pincode: string
          country?: string
          subtotal: number
          shipping_charge: number
          discount?: number
          total: number
          payment_method?: string
          payment_status?: string
          order_status?: string
          tracking_number?: string | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          address_line?: string
          landmark?: string | null
          city_village?: string
          state?: string
          pincode?: string
          country?: string
          subtotal?: number
          shipping_charge?: number
          discount?: number
          total?: number
          payment_method?: string
          payment_status?: string
          order_status?: string
          tracking_number?: string | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_image: string
          price: number
          quantity: number
          pack_size: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_image: string
          price: number
          quantity: number
          pack_size: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_image?: string
          price?: number
          quantity?: number
          pack_size?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      store_settings: {
        Row: {
          id: string
          store_name: string
          tagline: string
          founder_name: string
          phone: string
          whatsapp: string
          email: string
          address: string
          city: string
          state: string
          country: string
          free_shipping_threshold: number
          standard_shipping_fee: number
          announcement_text: string | null
          cod_available: boolean
          online_payment_available: boolean
          upi_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_name?: string
          tagline?: string
          founder_name?: string
          phone?: string
          whatsapp?: string
          email?: string
          address?: string
          city?: string
          state?: string
          country?: string
          free_shipping_threshold?: number
          standard_shipping_fee?: number
          announcement_text?: string | null
          cod_available?: boolean
          online_payment_available?: boolean
          upi_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_name?: string
          tagline?: string
          founder_name?: string
          phone?: string
          whatsapp?: string
          email?: string
          address?: string
          city?: string
          state?: string
          country?: string
          free_shipping_threshold?: number
          standard_shipping_fee?: number
          announcement_text?: string | null
          cod_available?: boolean
          online_payment_available?: boolean
          upi_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          id: string
          admin_id: string | null
          admin_email: string
          action: string
          entity_type: string
          entity_id: string
          details: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id?: string | null
          admin_email: string
          action: string
          entity_type: string
          entity_id: string
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string | null
          admin_email?: string
          action?: string
          entity_type?: string
          entity_id?: string
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: {
          check_user_id: string
        }
        Returns: boolean
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
