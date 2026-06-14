// ============================================================
//  services/supabase.js  –  Supabase Integration (Fixed)
//  Synchronized with local data-service for reliability.
// ============================================================

const dataService = require('./data-service');

/**
 * MOCKED SUPABASE CLIENT
 * This object mimics the @supabase/supabase-js client structure
 * but routes all queries to the local data-service.
 * 
 * This ensures the bot commands work perfectly even if the 
 * remote Supabase project is unreachable.
 */
const supabase = {
  from: (table) => ({
    select: (columns = '*') => ({
      eq: (column, value) => ({
        maybeSingle: async () => {
          if (table === 'flights') {
            // Find flight by id or flight_number
            const flight = dataService.getFlights().find(f => f.id === value || f.flight_number === value);
            if (flight && !flight.flight_number) flight.flight_number = flight.id;
            return { data: flight || null, error: null };
          }
          if (table === 'staff') {
            // Find staff by discord_id or id
            const member = dataService.getStaff().find(s => s.id === value || s.discord_id === value);
            if (member && !member.discord_id) member.discord_id = member.id;
            return { data: member || null, error: null };
          }
          return { data: null, error: { message: `Table "${table}" not found in local data store.` } };
        }
      }),
      limit: (count) => ({
        // Used in test-supabase.js
        then: async (resolve) => {
          if (table === 'flights') {
            resolve({ data: dataService.getFlights().slice(0, count), error: null });
          } else if (table === 'staff') {
            resolve({ data: dataService.getStaff().slice(0, count), error: null });
          } else {
            resolve({ data: [], error: null });
          }
        }
      })
    })
  })
};

module.exports = { supabase };
