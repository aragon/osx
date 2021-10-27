import React, { useState, useMemo, useContext } from 'react'
import { init as initApm, ApmBase } from '@elastic/apm-rum'

interface IAPMContext {
  apm: ApmBase | null
  setApm: React.Dispatch<React.SetStateAction<ApmBase | null>> | null
}
const UseAPMContext = React.createContext<IAPMContext>({
  apm: null,
  setApm: null
})

const APMProvider: React.FC = ({ children }) => {
  const [apm, setApm] = useState<ApmBase | null>(() => {
    if (
      import.meta.env.VITE_REACT_APP_DEPLOY_VERSION &&
      import.meta.env.VITE_REACT_APP_DEPLOY_ENVIRONMENT
    ) {
      return initApm({
        serviceName: 'zaragoza',
        serverUrl: 'https://apm-monitoring.aragon.org',
        serviceVersion: import.meta.env.VITE_REACT_APP_DEPLOY_VERSION as string,
        environment: import.meta.env.VITE_REACT_APP_DEPLOY_ENVIRONMENT as string
      })
    } else {
      console.warn(
        'REACT_APP_DEPLOY_VERSION or REACT_APP_DEPLOY_ENVIRONMENT is not provided.'
      )
      return null
    }
  })

  const contextValue = useMemo(() => {
    return { apm, setApm }
  }, [apm, setApm])

  return (
    <UseAPMContext.Provider value={contextValue}>
      {children}
    </UseAPMContext.Provider>
  )
}

const useAPM = () => {
  return useContext(UseAPMContext)
}

const updateAPMContext = (apm: ApmBase | null, networkType: string | null) => {
  if (apm && networkType) {
    const context = { networkType: networkType }
    apm.addLabels(context)
    apm.setCustomContext(context)
  }
}

export { APMProvider, useAPM, updateAPMContext }
