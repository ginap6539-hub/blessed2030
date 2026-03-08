
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { User } from '../types';

interface NetworkMapProps {
  users: User[];
}

const NetworkMap: React.FC<NetworkMapProps> = ({ users }) => {
  const position: [number, number] = [12.8797, 121.7740]; // Center of the Philippines

  // PERFORMANCE UPDATE: Filtering valid locations regardless of online status
  const usersWithLocation = users.filter(u => u.last_lat && u.last_lng);

  return (
    <MapContainer 
        // @ts-ignore
        center={position} 
        zoom={6} 
        scrollWheelZoom={true} 
        className="z-0 h-full w-full"
        // SCALABILITY UPDATE: Prefer Canvas rendering for thousands of markers
        // @ts-ignore
        preferCanvas={true}
    >
      <TileLayer
        // @ts-ignore
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {usersWithLocation.map(user => {
        const isMock = user.id.toString().startsWith('mock-');
        
        if (isMock) {
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                  <div style="width: 24px; height: 24px; position: relative;">
                    <img src="https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}" 
                         style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; object-fit: cover; background: white;" />
                  </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });
            return (
                <Marker
                    key={user.id}
                    // @ts-ignore
                    position={[user.last_lat!, user.last_lng!]}
                    // @ts-ignore
                    icon={customIcon}
                >
                    <Popup>
                        <div className="text-center p-2 min-w-[150px]">
                            <p className="font-black text-xs uppercase text-[#003366] leading-none">{user.first_name} {user.last_name}</p>
                            <p className="text-[9px] font-black text-amber-500 tracking-widest uppercase mt-1">{user.blessed_id}</p>
                        </div>
                    </Popup>
                </Marker>
            );
        }

        // High-performance custom marker for real users
        const customIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="width: 32px; height: 32px; position: relative;">
              <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name}`}" 
                   style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #003366; object-fit: cover; background: white;" />
              <div style="position: absolute; bottom: 2px; right: 2px; width: 8px; height: 8px; background: ${user.is_online ? '#22c55e' : '#94a3b8'}; border-radius: 50%; border: 1.5px solid white;"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        return (
          <Marker 
            key={user.id} 
            // @ts-ignore
            position={[user.last_lat!, user.last_lng!]} 
            // @ts-ignore
            icon={customIcon}
          >
            <Popup>
              <div className="text-center p-2 min-w-[150px]">
                <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name}`} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-[#003366] object-cover" />
                <p className="font-black text-xs uppercase text-[#003366] leading-none">{user.first_name} {user.last_name}</p>
                <p className="text-[9px] font-black text-amber-500 tracking-widest uppercase mt-1">{user.blessed_id}</p>
                <div className="w-full h-[1px] bg-slate-100 my-2"></div>
                <p className="text-[8px] text-slate-400 font-bold uppercase">
                  Last Active: {user.last_active ? new Date(user.last_active).toLocaleString() : 'N/A'}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default NetworkMap;
