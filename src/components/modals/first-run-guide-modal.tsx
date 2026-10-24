import {
  Badge,
  Button,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalProps,
  Text,
  VStack,
} from "@chakra-ui/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuBox,
  LuCheck,
  LuDownload,
  LuExternalLink,
  LuUser,
} from "react-icons/lu";
import { useLauncherConfig } from "@/contexts/config";
import { useGlobalData } from "@/contexts/global-data";
import { ConfigService } from "@/services/config";

// Registration entry point of the club skin server (Yggdrasil auth server).
const SKIN_SITE_REGISTER_URL = "https://skin.xauatcraft.com/auth/register";

const FirstRunGuideModal: React.FC<Omit<ModalProps, "children">> = ({
  ...props
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { config } = useLauncherConfig();
  const { getPlayerList, getInstanceList } = useGlobalData();
  const primaryColor = config.appearance.theme.primaryColor;

  const [hasJava, setHasJava] = useState<boolean | undefined>(undefined);
  const [hasPlayer, setHasPlayer] = useState(false);
  const [hasInstance, setHasInstance] = useState(false);

  useEffect(() => {
    ConfigService.retrieveJavaList().then((response) => {
      if (response.status === "success") {
        setHasJava((response.data ?? []).length > 0);
      }
    });
  }, []);

  // The getters lazy-load their data and change identity once it arrives,
  // so re-run them whenever the underlying lists are refreshed.
  useEffect(() => {
    setHasPlayer((getPlayerList() ?? []).length > 0);
  }, [getPlayerList]);

  useEffect(() => {
    setHasInstance((getInstanceList() ?? []).length > 0);
  }, [getInstanceList]);

  const handleNavigate = (path: string) => {
    props.onClose();
    router.push(path);
  };

  const steps = [
    {
      key: "java",
      icon: LuDownload,
      done: hasJava === true,
      onAction: () => handleNavigate("/settings/java"),
    },
    {
      key: "skin",
      icon: LuExternalLink,
      done: false,
      onAction: () => openUrl(SKIN_SITE_REGISTER_URL),
    },
    {
      key: "account",
      icon: LuUser,
      done: hasPlayer,
      onAction: () => handleNavigate("/accounts"),
    },
    {
      key: "instance",
      icon: LuBox,
      done: hasInstance,
      onAction: () => handleNavigate("/instances"),
    },
  ];

  return (
    <Modal closeOnEsc={false} size={{ base: "sm", lg: "md" }} {...props}>
      <ModalOverlay />
      <ModalContent borderRadius="md">
        <ModalHeader>{t("FirstRunGuideModal.header.title")}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text color="gray.500" fontSize="sm">
            {t("FirstRunGuideModal.header.description")}
          </Text>
          <VStack align="stretch" spacing={2.5} mt={4}>
            {steps.map((step) => (
              <HStack
                key={step.key}
                align="flex-start"
                spacing={3}
                p={3}
                borderWidth="1px"
                borderColor={
                  step.done ? `${primaryColor}.200` : "chakra-border-color"
                }
                borderRadius="md"
              >
                <Icon
                  as={step.done ? LuCheck : step.icon}
                  boxSize={4}
                  mt={1}
                  color={step.done ? `${primaryColor}.500` : "gray.500"}
                />
                <VStack align="flex-start" spacing={0.5} flex="1">
                  <HStack spacing={2}>
                    <Text fontWeight="medium" fontSize="sm">
                      {t(`FirstRunGuideModal.steps.${step.key}.title`)}
                    </Text>
                    {step.done && (
                      <Badge colorScheme={primaryColor} fontSize="2xs">
                        {t("FirstRunGuideModal.status.done")}
                      </Badge>
                    )}
                  </HStack>
                  <Text className="secondary-text" fontSize="xs-sm">
                    {t(`FirstRunGuideModal.steps.${step.key}.description`)}
                  </Text>
                </VStack>
                {!step.done && (
                  <Button
                    size="xs"
                    variant="subtle"
                    colorScheme={primaryColor}
                    flexShrink={0}
                    onClick={step.onAction}
                  >
                    {t(`FirstRunGuideModal.steps.${step.key}.action`)}
                  </Button>
                )}
              </HStack>
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3} ml="auto">
            <Button variant="ghost" onClick={props.onClose}>
              {t("FirstRunGuideModal.footer.later")}
            </Button>
            <Button
              colorScheme={primaryColor}
              onClick={() => handleNavigate("/launch")}
            >
              {t("FirstRunGuideModal.footer.launch")}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FirstRunGuideModal;
