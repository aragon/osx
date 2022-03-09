import {Address} from '@aragon/ui-components/src/utils/addresses';
import {useProviders} from 'context/providers';
import {useState, useEffect} from 'react';
import {HookData} from 'utils/types';

export function useEnsName(address: Address): HookData<string> {
  const {web3} = useProviders();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    async function fetchEnsData() {
      setIsLoading(true);

      if (web3 && address) {
        try {
          let res = await web3.lookupAddress(address);
          if (!res) res = '';
          setName(res);
        } catch (error) {
          setError(new Error('Failed to fetch ENS name'));
          console.error(error);
        }
      } else {
        setName('');
      }
      setIsLoading(false);
    }

    fetchEnsData();
  }, [web3, address]);
  return {data: name, isLoading, error};
}

export function useEnsAvatar(address: Address): HookData<string> {
  const {web3} = useProviders();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    async function fetchEnsData() {
      setIsLoading(true);

      if (web3 && address) {
        try {
          let res = await web3.getAvatar(address);
          if (!res) res = '';
          setAvatarUrl(res);
        } catch (error) {
          setError(new Error('Failed to fetch ENS Avatar'));
          console.error(error);
        }
      } else {
        setAvatarUrl('');
      }
      setIsLoading(false);
    }

    fetchEnsData();
  }, [web3, address]);

  return {data: avatarUrl, isLoading, error};
}
