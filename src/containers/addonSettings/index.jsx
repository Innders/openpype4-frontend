import axios from 'axios'

import { useState, useMemo } from 'react'
import { toast } from 'react-toastify'
import ReactMarkdown from 'react-markdown'

import {
  Button,
  Spacer,
  Section,
  Panel,
  Toolbar,
  ScrollPanel,
} from 'openpype-components'

import AddonList from '/src/containers/addonList'
import AddonSettingsPanel from './addonSettingsPanel'

const AddonSettings = ({ projectName }) => {
  const [showVersions, setShowVersions] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [selectedAddons, setSelectedAddons] = useState([])
  const [reloadTrigger, setReloadTrigger] = useState({})
  const [localData, setLocalData] = useState({})
  const [localOverrides, setLocalOverrides] = useState({})
  const [currentSelection, setCurrentSelection] = useState(null)

  const projectSuffix = projectName ? `/${projectName}` : ''

  const onSettingsChange = (addonName, addonVersion, data) => {
    setLocalData((localData) => {
      localData[`${addonName}@${addonVersion}`] = data
      return { ...localData }
    })
  }

  const onSetChangedKeys = (addonName, addonVersion, data) => {
    setLocalOverrides((localOverrides) => {
      localOverrides[`${addonName}@${addonVersion}`] = data
      return { ...localOverrides }
    })
  }

  const forceAddonReload = (addonName, addonVersion) => {
    setReloadTrigger((reloadTrigger) => {
      const now = new Date()
      return {
        ...reloadTrigger,
        [`${addonName}@${addonVersion}`]: now,
      }
    })
  }

  const onSave = () => {
    for (const key in localData) {
      const [addonName, addonVersion] = key.split('@')
      axios
        .post(
          `/api/addons/${addonName}/${addonVersion}/settings${projectSuffix}`,
          localData[key]
        )
        .then(() => {
          setLocalOverrides({})
          setLocalData({})
        })
        .catch((err) => {
          toast.error((
            <ReactMarkdown>
{`Unable to save ${addonName} ${addonVersion} settings

${err.response?.data?.detail}`}
            </ReactMarkdown>
          ))
          console.log(err)
        })
        .finally(() => {
          forceAddonReload(addonName, addonVersion)
        })
    }
  }

  const onDismissChanges = (addonName, addonVersion) => {
    const key = `${addonName}@${addonVersion}`

    setLocalData((localData) => {
      const res = { ...localData }
      if (res[key]) delete res[key]
      return res
    })

    setLocalOverrides((overrides) => {
      const res = { ...overrides }
      if (res[key]) delete res[key]
      return res
    })

    forceAddonReload(addonName, addonVersion)
  } // end of onDismissChanges

  const onRemoveOverrides = (addonName, addonVersion) => {
    axios
      .delete(
        `/api/addons/${addonName}/${addonVersion}/overrides${projectSuffix}`
      )
      .then(() => {
        onDismissChanges(addonName, addonVersion)
      })
  }

  const deleteOverride = (addon, path) => {
    console.log('DELETING OVERRIDE', path)
    axios
      .post(
        `/api/addons/${addon.name}/${addon.version}/overrides${projectSuffix}`,
        { action: 'delete', path: path }
      )
      .catch(() => {
        console.log('e-eee')
      })
      .then(() => {
        console.log('Override deleted')
      })
      .finally(() => {
        forceAddonReload(addon.name, addon.version)
      })
  }

  const pinOverride = (addon, path) => {
    console.log('PINNING OVERRIDE', path)
    axios
      .post(
        `/api/addons/${addon.name}/${addon.version}/overrides${projectSuffix}`,
        { action: 'pin', path: path }
      )
      .catch(() => {
        console.log('e-eee')
      })
      .then(() => {
        console.log('Override deleted')
      })
      .finally(() => {
        forceAddonReload(addon.name, addon.version)
      })
  }

  //
  // RENDER
  //

  const addonListHeader = useMemo(
    () => (
      <Toolbar>
        <Button
          checked={showVersions}
          onClick={() => setShowVersions((v) => !v)}
          label={showVersions ? 'Hide all versions' : 'Show all versions'}
        />
      </Toolbar>
    ),
    [showVersions]
  )

  const settingsListHeader = useMemo(() => {
    return (
      <Toolbar>
        <Button icon="content_copy" disabled={true} />
        <Button icon="content_paste" disabled={true} />
        <Button
          icon="push_pin"
          tooltip="Pin default value as an override"
          disabled={
            !currentSelection?.addon?.name ||
            currentSelection.hasOverride ||
            (localOverrides[currentSelection.addonString] || []).includes(
              currentSelection.fieldId
            )
          }
          onClick={() =>
            pinOverride(currentSelection.addon, currentSelection.path)
          }
        />
        <Button
          icon="lock_reset"
          tooltip="Remove override from the selected field"
          disabled={
            !currentSelection?.addon?.name || !currentSelection.hasOverride
          }
          onClick={() =>
            deleteOverride(currentSelection.addon, currentSelection.path)
          }
        />

        <Spacer>
          {currentSelection && (
            <ul className="settings-breadcrumbs">
              <li>{currentSelection.addon?.name}</li>
              {(currentSelection?.path || []).map((breadcrumb, index) => (
                <li key={index}>{breadcrumb}</li>
              ))}
            </ul>
          )}
        </Spacer>

        <Button
          onClick={() => {
            setShowHelp(!showHelp)
          }}
          icon="help"
        />
      </Toolbar>
    )
  }, [showHelp, currentSelection, localOverrides])

  return (
    <>
      <AddonList
        showVersions={showVersions}
        selectedAddons={selectedAddons}
        setSelectedAddons={setSelectedAddons}
        changedAddons={Object.keys(localData)}
        onDismissChanges={onDismissChanges}
        onRemoveOverrides={onRemoveOverrides}
        header={addonListHeader}
      />

      <Section className={showHelp && 'settings-help-visible'}>
        {settingsListHeader}
        <Section>
          <ScrollPanel
            className="transparent nopad"
            style={{ flexGrow: 1 }}
            scrollStyle={{ padding: 0 }}
          >
            {selectedAddons
              .filter((addon) => addon.version)
              .reverse()
              .map((addon) => (
                <Panel
                  key={`${addon.name}-${addon.version}`}
                  style={{ flexGrow: 0 }}
                  className="transparent nopad"
                  size={1}
                >
                  <AddonSettingsPanel
                    addon={addon}
                    onChange={(data) =>
                      onSettingsChange(addon.name, addon.version, data)
                    }
                    onSetChangedKeys={(data) =>
                      onSetChangedKeys(addon.name, addon.version, data)
                    }
                    localData={localData[`${addon.name}@${addon.version}`]}
                    changedKeys={
                      localOverrides[`${addon.name}@${addon.version}`]
                    }
                    reloadTrigger={
                      reloadTrigger[`${addon.name}@${addon.version}`]
                    }
                    onSelect={setCurrentSelection}
                    projectName={projectName}
                  />
                </Panel>
              ))}

            <Spacer />
          </ScrollPanel>
        </Section>
      </Section>

      <Section style={{ maxWidth: 300 }}>
        <Toolbar>
          <Spacer />
          <Button
            label="Revert changes"
            icon="refresh"
            onClick={onDismissChanges}
          />
          <Button label="Save changes" icon="check" onClick={onSave} />
        </Toolbar>
        <ScrollPanel style={{ flexGrow: 1 }}>
          <h3>Form data</h3>
          <pre style={{ width: '100%', flexGrow: 1 }}>
            {JSON.stringify(localData, null, 2)}
          </pre>
          <h3>Changed keys</h3>
          <pre style={{ width: '100%', flexGrow: 1 }}>
            {JSON.stringify(localOverrides, null, 2)}
          </pre>
        </ScrollPanel>
      </Section>
    </>
  )
}

export default AddonSettings
