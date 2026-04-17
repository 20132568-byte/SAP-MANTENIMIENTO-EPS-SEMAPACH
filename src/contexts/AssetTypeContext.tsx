import { createContext, useContext, useState, ReactNode } from 'react'

export type AssetTypeFilter = 'fleet' | 'stations'

interface AssetTypeContextType {
    assetType: AssetTypeFilter
    setAssetType: (type: AssetTypeFilter) => void
    label: string
}

const AssetTypeContext = createContext<AssetTypeContextType>({
    assetType: 'fleet',
    setAssetType: () => { },
    label: 'Flota Vehicular',
})

const labels: Record<AssetTypeFilter, string> = {
    fleet: 'Flota Vehicular',
    stations: 'Estaciones Hídricas',
}

export function AssetTypeProvider({ children }: { children: ReactNode }) {
    const [assetType, setAssetType] = useState<AssetTypeFilter>('fleet')
    return (
        <AssetTypeContext.Provider value={{ assetType, setAssetType, label: labels[assetType] }}>
            {children}
        </AssetTypeContext.Provider>
    )
}

export function useAssetType() {
    return useContext(AssetTypeContext)
}
