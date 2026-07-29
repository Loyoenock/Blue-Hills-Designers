-- ==========================================
-- MIGRATION: ADD DYNAMIC SIZES & COLORS COLUMNS
-- ==========================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;

DO $$
DECLARE
    r RECORD;
    parsed_json JSONB;
    extracted_sizes TEXT[];
    extracted_colors TEXT[];
    orig_short TEXT;
BEGIN
    FOR r IN SELECT id, short_description, description FROM public.products LOOP
        IF r.short_description IS NOT NULL AND r.short_description LIKE '{%}' THEN
            BEGIN
                parsed_json := r.short_description::jsonb;

                -- Extract sizes array if present
                IF parsed_json ? 'sizes' AND jsonb_typeof(parsed_json->'sizes') = 'array' THEN
                    extracted_sizes := ARRAY(SELECT jsonb_array_elements_text(parsed_json->'sizes'));
                ELSE
                    extracted_sizes := '{}'::TEXT[];
                END IF;

                -- Extract colors array if present
                IF parsed_json ? 'colors' AND jsonb_typeof(parsed_json->'colors') = 'array' THEN
                    extracted_colors := ARRAY(SELECT jsonb_array_elements_text(parsed_json->'colors'));
                ELSE
                    extracted_colors := '{}'::TEXT[];
                END IF;

                -- Extract original_short if present
                IF parsed_json ? 'original_short' AND jsonb_typeof(parsed_json->'original_short') = 'string' AND length(parsed_json->>'original_short') > 0 THEN
                    orig_short := parsed_json->>'original_short';
                ELSE
                    orig_short := substring(COALESCE(r.description, ''), 1, 150);
                END IF;

                -- Update the product row
                UPDATE public.products
                SET sizes = extracted_sizes,
                    colors = extracted_colors,
                    short_description = orig_short
                WHERE id = r.id;

            EXCEPTION WHEN OTHERS THEN
                -- If JSON parsing fails, leave short_description untouched and sizes/colors as default empty array
                NULL;
            END;
        END IF;
    END LOOP;
END $$;
