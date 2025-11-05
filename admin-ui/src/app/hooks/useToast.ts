import { useSnackbar } from 'notistack';

export const useToast = () => {
  const { enqueueSnackbar } = useSnackbar();

  return {
    success: (message: string) => {
      enqueueSnackbar(message, { variant: 'success' });
    },
    error: (message: string) => {
      enqueueSnackbar(message, { variant: 'error' });
    },
  };
};
