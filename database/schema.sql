/* =========================================================
   STATION TRACKING DATABASE SCHEMA
   Database: station_tracking_db
   Schema: tracking
   ========================================================= */


/* =========================================================
   CREATE SCHEMA
   ========================================================= */

CREATE SCHEMA IF NOT EXISTS tracking;


/* =========================================================
   STATIONS TABLE
   Stores master data of stations and geofence
   ========================================================= */

CREATE TABLE IF NOT EXISTS tracking.stations (

    station_id VARCHAR(50) PRIMARY KEY,

    assigned_latitude DOUBLE PRECISION NOT NULL,
    assigned_longitude DOUBLE PRECISION NOT NULL,

    allowed_radius_meters INTEGER DEFAULT 300,

    status VARCHAR(20)
        DEFAULT 'OFFLINE'
        CHECK (status IN ('INSIDE','OUTSIDE','OFFLINE')),

    created_at TIMESTAMP WITHOUT TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITHOUT TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    last_heartbeat TIMESTAMP WITHOUT TIME ZONE

);


/* =========================================================
   STATIONS INDEXES
   ========================================================= */

CREATE INDEX IF NOT EXISTS idx_station_status
ON tracking.stations(status);

CREATE INDEX IF NOT EXISTS idx_stations_station_id
ON tracking.stations(station_id);

CREATE INDEX IF NOT EXISTS idx_stations_heartbeat
ON tracking.stations(last_heartbeat);


/* =========================================================
   CURRENT LOCATION TABLE
   Stores latest location of every station
   ========================================================= */

CREATE TABLE IF NOT EXISTS tracking.current_location (

    station_id VARCHAR(50) PRIMARY KEY,

    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    distance_meters INTEGER,

    status VARCHAR(20)
        CHECK (status IN ('INSIDE','OUTSIDE','OFFLINE')),

    updated_at TIMESTAMP WITHOUT TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT current_location_station_id_fkey
        FOREIGN KEY (station_id)
        REFERENCES tracking.stations(station_id)
        ON DELETE CASCADE
);


/* =========================================================
   CURRENT LOCATION INDEXES
   ========================================================= */

CREATE INDEX IF NOT EXISTS idx_current_location_station_id
ON tracking.current_location(station_id);

CREATE INDEX IF NOT EXISTS idx_current_location_updated_at
ON tracking.current_location(updated_at);

CREATE INDEX IF NOT EXISTS idx_current_status
ON tracking.current_location(status);


/* =========================================================
   LOCATION LOGS TABLE
   Stores historical GPS updates
   ========================================================= */

CREATE TABLE IF NOT EXISTS tracking.location_logs (

    id BIGSERIAL PRIMARY KEY,

    station_id VARCHAR(50),

    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    distance_meters INTEGER,

    status VARCHAR(20)
        CHECK (status IN ('INSIDE','OUTSIDE','OFFLINE')),

    recorded_at TIMESTAMP WITHOUT TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT location_logs_station_id_fkey
        FOREIGN KEY (station_id)
        REFERENCES tracking.stations(station_id)
        ON DELETE CASCADE
);


/* =========================================================
   LOCATION LOGS INDEXES
   ========================================================= */

CREATE INDEX IF NOT EXISTS idx_logs_station
ON tracking.location_logs(station_id);

CREATE INDEX IF NOT EXISTS idx_logs_station_id
ON tracking.location_logs(station_id);

CREATE INDEX IF NOT EXISTS idx_logs_status
ON tracking.location_logs(status);

CREATE INDEX IF NOT EXISTS idx_logs_time
ON tracking.location_logs(recorded_at);

CREATE INDEX IF NOT EXISTS idx_logs_recorded_at
ON tracking.location_logs(recorded_at);

CREATE INDEX IF NOT EXISTS idx_logs_recent
ON tracking.location_logs(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_station_time
ON tracking.location_logs(station_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_station_status_time
ON tracking.location_logs(station_id, status, recorded_at DESC);


/* =========================================================
   USERS TABLE (PUBLIC SCHEMA)
   For authentication
   ========================================================= */

CREATE TABLE IF NOT EXISTS public.users (

    id SERIAL PRIMARY KEY,

    email TEXT UNIQUE NOT NULL,

    password TEXT NOT NULL,

    created_at TIMESTAMP WITHOUT TIME ZONE
        DEFAULT CURRENT_TIMESTAMP

);


/* =========================================================
   USERS INDEX
   ========================================================= */

CREATE INDEX IF NOT EXISTS idx_users_email
ON public.users(email);


/* =========================================================
   OPTIONAL: DEFAULT SEARCH PATH
   ========================================================= */

SET search_path TO tracking, public;


/* =========================================================
   END OF SCHEMA
   ========================================================= */