import { useState, useEffect } from 'react'
import LoadingPage from '/src/pages/loading'
import axios from 'axios'
import { toast } from 'react-toastify'

import {
  FormLayout,
  FormRow,
  InputText,
  InputPassword,
  Button,
  Section,
  Panel,
  Spacer,
} from 'openpype-components'

const SessionItem = ({ session, userName, onChange }) => {
  const invalidate = () => {
    axios
      .delete(`/api/users/${userName}/sessions/${session.token}`)
      .then(() => {
        toast.success('Session invalidated')
        onChange()
      })
      .catch(() => toast.error('Unable to invalidate the session'))
  }

  return (
    <Panel>
      {session.token}{' '}
      {session.token === localStorage.getItem('accessToken') &&
        '(this session)'}
      <Button label="Invalidate" onClick={invalidate} />
    </Panel>
  )
}

const SessionList = ({ userName }) => {
  const [sessions, setSessions] = useState([])

  const loadSessionList = () => {
    axios
      .get(`/api/users/${userName}/sessions`)
      .then((response) => {
        setSessions(response.data.sessions)
      })
      .catch(() => toast.error('Unable to load sessions'))
  }

  useEffect(() => {
    loadSessionList()
  }, [userName])

  return (
    <>
      {sessions.map((session) => (
        <SessionItem
          key={session.token}
          session={session}
          userName={userName}
          onChange={loadSessionList}
        />
      ))}
    </>
  )
}

const ProfilePage = () => {
  const [userData, setUserData] = useState(null)
  const [formData, setFormData] = useState({})

  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')

  const loadUserData = () => {
    axios
      .get('/api/users/me')
      .then((result) => {
        setUserData(result.data)
        setFormData({
          fullName: result.data.attrib.fullName,
          email: result.data.attrib.email,
        })
      })
      .catch(() => toast.error('Unable to load user data'))
  }

  useEffect(loadUserData, [])

  if (!userData) return <LoadingPage />

  let passInvalid = false
  if (!pass1) passInvalid = 'Password unchanged'
  else if (pass1 !== pass2) passInvalid = 'Passwords mismatch'

  const setAttrib = (key, value) => {
    setFormData((fd) => {
      return { ...fd, [key]: value }
    })
  }

  const saveProfile = () => {
    axios
      .patch(`/api/users/${userData.name}`, {
        attrib: {
          fullName: formData.fullName,
          email: formData.email,
        },
      })
      .then(() => {
        toast.success('Profile updated')
        loadUserData()
      })
  }

  const savePassword = () => {
    axios
      .patch(`/api/users/${userData.name}/password`, { password: pass1 })
      .then(() => {
        toast.success('Password changed')
      })
      .catch(() => {
        toast.error('Unable to change password')
      })
  }

  return (
    <main>
      <Section style={{ maxWidth: 400 }}>
        <h2>Basic information</h2>
        <Panel>
          <FormLayout>
            <FormRow label="User name">
              <InputText value={userData.name} disabled={true} />
            </FormRow>
            <FormRow label="Full name">
              <InputText
                value={formData.fullName}
                onChange={(e) => setAttrib('fullName', e.target.value)}
              />
            </FormRow>
            <FormRow label="Email">
              <InputText
                value={formData.email}
                onChange={(e) => setAttrib('email', e.target.value)}
              />
            </FormRow>
            <FormRow>
              <Button
                label="Update profile"
                icon="check"
                onClick={saveProfile}
              />
            </FormRow>
          </FormLayout>
        </Panel>

        <h2>Change password</h2>

        <Panel>
          <FormLayout>
            <FormRow label="New password">
              <InputPassword
                value={pass1}
                onChange={(e) => setPass1(e.target.value)}
              />
            </FormRow>
            <FormRow label="Confirm password">
              <InputPassword
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
              />
            </FormRow>
            <FormRow>
              <Button
                label="Update password"
                icon="lock"
                onClick={savePassword}
                disabled={passInvalid}
              />
            </FormRow>
          </FormLayout>
        </Panel>
      </Section>
      {userData.name && (
        <Section style={{ flexGrow: 0 }}>
          <h2>Active sessions</h2>
          <SessionList userName={userData.name} />
        </Section>
      )}
      <Spacer />
    </main>
  )
}

export default ProfilePage
