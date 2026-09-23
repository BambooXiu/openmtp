import React, { PureComponent } from 'react';
import { ipcRenderer } from 'electron';
import electronIs from 'electron-is';
import classNames from 'classnames';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import { withTranslation } from 'react-i18next';
import SettingsDialogTabContainer from './SettingsDialogTabContainer';
import {
  DEVICE_TYPE,
  FILE_EXPLORER_VIEW_TYPE,
  APP_THEME_MODE_TYPE,
  MTP_MODE,
  FILE_TRANSFER_DIRECTION,
} from '../../../enums';
import { capitalize, isPrereleaseVersion } from '../../../utils/funcs';
import { IpcEvents } from '../../../services/ipc-events/IpcEventType';
import { isKalamModeSupported } from '../../../helpers/binaries';
import { APP_LANGUAGE } from '../../../i18n/language';

const isMas = electronIs.mas();

export class SettingsDialog extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      tabIndex: 0,
    };

    this.isMasHidePosition = 1;
  }

  _handleTabChange = (event, index) => {
    this.setState({
      tabIndex: index,
    });
  };

  shoudThisTabHeadRender = (position) => {
    return !(isMas && this.isMasHidePosition === position);
  };

  tabBodyRenderTabIndex = (position) => {
    if (isMas && this.isMasHidePosition === position) {
      return null;
    }

    if (isMas && position > this.isMasHidePosition) {
      return position - 1 < 1 ? 0 : position - 1;
    }

    return position;
  };

  render() {
    const {
      open,
      freshInstall,
      hideHiddenFiles,
      fileExplorerListingType,
      appLanguage,
      appThemeMode,
      styles,
      enableAutoUpdateCheck,
      enableBackgroundAutoUpdate,
      enablePrereleaseUpdates,
      enableAnalytics,
      enableStatusBar,
      showLocalPane,
      showLocalPaneOnLeftSide,
      showDirectoriesFirst,
      mtpMode,
      filesPreprocessingBeforeTransfer,
      onAnalyticsChange,
      onAppLanguageChange,
      onHiddenFilesChange,
      onFileExplorerListingType,
      onDialogBoxCloseBtnClick,
      onAutoUpdateCheckChange,
      onEnableBackgroundAutoUpdateChange,
      onPrereleaseUpdatesChange,
      onStatusBarChange,
      onAppThemeModeChange,
      onShowLocalPaneChange,
      onShowLocalPaneOnLeftSideChange,
      onShowDirectoriesFirstChange,
      onMtpModeChange,
      onFilesPreprocessingBeforeTransferChange,
      onEnableUsbHotplug,
      enableUsbHotplug,
      t,
    } = this.props;

    const { tabIndex } = this.state;

    const hideHiddenFilesLocal = hideHiddenFiles[DEVICE_TYPE.local];
    const hideHiddenFilesMtp = hideHiddenFiles[DEVICE_TYPE.mtp];

    const fileExplorerListingTypeLocalGrid =
      fileExplorerListingType[DEVICE_TYPE.local] ===
      FILE_EXPLORER_VIEW_TYPE.grid;
    const fileExplorerListingTypeMtpGrid =
      fileExplorerListingType[DEVICE_TYPE.mtp] === FILE_EXPLORER_VIEW_TYPE.grid;

    const showMtpModeSelection = isKalamModeSupported();
    const computerLabel = t('common.devices.computer');
    const phoneLabel = t('common.devices.phone');

    return (
      <Dialog
        open={open}
        fullWidth
        maxWidth="sm"
        aria-labelledby="settings-dialogbox"
        disableEscapeKeyDown={false}
        onEscapeKeyDown={() =>
          onDialogBoxCloseBtnClick({
            confirm: false,
          })
        }
      >
        <Typography variant="h5" className={styles.title}>
          {t('title')}
        </Typography>
        <DialogContent>
          <Tabs
            className={styles.tabHeadingWrapper}
            value={tabIndex}
            onChange={this._handleTabChange}
            indicatorColor="secondary"
            textColor="secondary"
            variant="scrollable"
            scrollButtons="auto"
          >
            {this.shoudThisTabHeadRender(0) && (
              <Tab label={t('tabs.general')} className={styles.tab} />
            )}
            {this.shoudThisTabHeadRender(1) && (
              <Tab label={t('tabs.fileManager')} className={styles.tab} />
            )}
            {this.shoudThisTabHeadRender(2) && (
              <Tab label={t('tabs.updates')} className={styles.tab} />
            )}
            {this.shoudThisTabHeadRender(3) && (
              <Tab label={t('tabs.privacy')} className={styles.tab} />
            )}
          </Tabs>

          {/* ----- General Tab ----- */}
          <FormControl component="fieldset" className={styles.fieldset}>
            {tabIndex === this.tabBodyRenderTabIndex(0) && (
              <SettingsDialogTabContainer>
                <div className={styles.tabContainer}>
                  <FormGroup>
                    <FormControl className={styles.languageControl}>
                      <InputLabel id="app-language-label">
                        {t('general.language.label')}
                      </InputLabel>
                      <Select
                        labelId="app-language-label"
                        id="app-language"
                        value={appLanguage}
                        onChange={onAppLanguageChange}
                      >
                        <MenuItem value={APP_LANGUAGE.english}>
                          {t('general.language.options.english')}
                        </MenuItem>
                        <MenuItem value={APP_LANGUAGE.simplifiedChinese}>
                          {t('general.language.options.simplifiedChinese')}
                        </MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="subtitle2" className={styles.subtitle}>
                      {t('general.theme.label')}
                    </Typography>
                    <RadioGroup
                      aria-label="app-theme-mode"
                      name="app-theme-mode"
                      value={appThemeMode}
                      onChange={onAppThemeModeChange}
                    >
                      <FormControlLabel
                        value={APP_THEME_MODE_TYPE.light}
                        control={<Radio />}
                        label={t('general.theme.options.light')}
                      />
                      <FormControlLabel
                        value={APP_THEME_MODE_TYPE.dark}
                        control={<Radio />}
                        label={t('general.theme.options.dark')}
                      />
                      <FormControlLabel
                        value={APP_THEME_MODE_TYPE.auto}
                        control={<Radio />}
                        label={t('general.theme.options.auto')}
                      />
                    </RadioGroup>

                    {showMtpModeSelection && (
                      <>
                        <Typography
                          variant="subtitle2"
                          className={`${styles.subtitle}  ${styles.fmSettingsStylesFix}`}
                        >
                          {t('general.mtpMode')}
                        </Typography>
                        <RadioGroup
                          aria-label="app-theme-mode"
                          name="app-theme-mode"
                          value={mtpMode}
                          onChange={(e, value) =>
                            onMtpModeChange(e, value, DEVICE_TYPE.mtp)
                          }
                        >
                          <FormControlLabel
                            value={MTP_MODE.kalam}
                            control={<Radio />}
                            label={capitalize(MTP_MODE.kalam)}
                          />
                          <FormControlLabel
                            value={MTP_MODE.legacy}
                            control={<Radio />}
                            label={capitalize(MTP_MODE.legacy)}
                          />
                        </RadioGroup>
                      </>
                    )}

                    <Typography
                      variant="subtitle2"
                      className={`${styles.subtitle} ${styles.fmSettingsStylesFix}`}
                    >
                      {t('general.usbHotplug')}
                    </Typography>
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={enableUsbHotplug}
                          onChange={(e) =>
                            onEnableUsbHotplug(e, !enableUsbHotplug)
                          }
                        />
                      }
                      label={
                        enableUsbHotplug
                          ? t('common.enabled')
                          : t('common.disabled')
                      }
                    />
                  </FormGroup>
                </div>
              </SettingsDialogTabContainer>
            )}

            {/* ----- File Manager Tab ----- */}
            {tabIndex === this.tabBodyRenderTabIndex(1) && (
              <SettingsDialogTabContainer>
                <div className={styles.tabContainer}>
                  <FormGroup>
                    <Typography variant="subtitle2" className={styles.subtitle}>
                      {t('fileManager.showHiddenFiles')}
                    </Typography>
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={!hideHiddenFilesLocal}
                          onChange={(e) =>
                            onHiddenFilesChange(
                              e,
                              !hideHiddenFilesLocal,
                              DEVICE_TYPE.local
                            )
                          }
                        />
                      }
                      label={computerLabel}
                    />
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={!hideHiddenFilesMtp}
                          onChange={(e) =>
                            onHiddenFilesChange(
                              e,
                              !hideHiddenFilesMtp,
                              DEVICE_TYPE.mtp
                            )
                          }
                        />
                      }
                      label={phoneLabel}
                    />

                    <Typography
                      variant="subtitle2"
                      className={`${styles.subtitle} ${styles.fmSettingsStylesFix}`}
                    >
                      {t('fileManager.viewAsGrid')}
                    </Typography>
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={fileExplorerListingTypeLocalGrid}
                          onChange={(e) =>
                            onFileExplorerListingType(
                              e,
                              fileExplorerListingTypeLocalGrid
                                ? FILE_EXPLORER_VIEW_TYPE.list
                                : FILE_EXPLORER_VIEW_TYPE.grid,
                              DEVICE_TYPE.local
                            )
                          }
                        />
                      }
                      label={computerLabel}
                    />
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={fileExplorerListingTypeMtpGrid}
                          onChange={(e) =>
                            onFileExplorerListingType(
                              e,
                              fileExplorerListingTypeMtpGrid
                                ? FILE_EXPLORER_VIEW_TYPE.list
                                : FILE_EXPLORER_VIEW_TYPE.grid,
                              DEVICE_TYPE.mtp
                            )
                          }
                        />
                      }
                      label={phoneLabel}
                    />

                    <Typography
                      variant="subtitle2"
                      className={`${styles.subtitle} ${styles.fmSettingsStylesFix}`}
                    >
                      {t('fileManager.overallProgress')}
                    </Typography>
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={
                            filesPreprocessingBeforeTransfer[
                              FILE_TRANSFER_DIRECTION.download
                            ]
                          }
                          onChange={(e) =>
                            onFilesPreprocessingBeforeTransferChange(
                              e,
                              !filesPreprocessingBeforeTransfer[
                                FILE_TRANSFER_DIRECTION.download
                              ],
                              FILE_TRANSFER_DIRECTION.download
                            )
                          }
                        />
                      }
                      label={t('fileManager.transferTo', {
                        device: computerLabel,
                      })}
                    />
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={
                            filesPreprocessingBeforeTransfer[
                              FILE_TRANSFER_DIRECTION.upload
                            ]
                          }
                          onChange={(e) =>
                            onFilesPreprocessingBeforeTransferChange(
                              e,
                              !filesPreprocessingBeforeTransfer[
                                FILE_TRANSFER_DIRECTION.upload
                              ],
                              FILE_TRANSFER_DIRECTION.upload
                            )
                          }
                        />
                      }
                      label={t('fileManager.transferTo', {
                        device: phoneLabel,
                      })}
                    />

                    {freshInstall ? (
                      <Paper
                        className={`${styles.onboardingPaper}`}
                        elevation={0}
                      >
                        <Typography
                          component="p"
                          className={`${styles.onboardingPaperBody}`}
                        >
                          <span className={`${styles.onboardingPaperBodyItem}`}>
                            &#9679;&nbsp;
                            {t('fileManager.onboarding.toggleHint')}
                          </span>
                          <span className={`${styles.onboardingPaperBodyItem}`}>
                            &#9679;&nbsp;
                            {t('fileManager.onboarding.scrollHint')}
                          </span>
                        </Typography>
                      </Paper>
                    ) : null}

                    <Typography variant="caption">
                      {t('fileManager.overallProgressNote')}
                    </Typography>

                    <Typography
                      variant="subtitle2"
                      className={`${styles.subtitle} ${styles.fmSettingsStylesFix}`}
                    >
                      {t('fileManager.showDirectoriesFirst')}
                    </Typography>
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={showDirectoriesFirst}
                          onChange={(e) =>
                            onShowDirectoriesFirstChange(
                              e,
                              !showDirectoriesFirst
                            )
                          }
                        />
                      }
                      label={
                        showDirectoriesFirst
                          ? t('common.enabled')
                          : t('common.disabled')
                      }
                    />

                    <Typography
                      variant="subtitle2"
                      className={`${styles.subtitle} ${styles.fmSettingsStylesFix}`}
                    >
                      {t('fileManager.showStatusBar')}
                    </Typography>
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={enableStatusBar}
                          onChange={(e) =>
                            onStatusBarChange(e, !enableStatusBar)
                          }
                        />
                      }
                      label={
                        enableStatusBar
                          ? t('common.enabled')
                          : t('common.disabled')
                      }
                    />

                    <Typography
                      variant="subtitle2"
                      className={`${styles.subtitle} ${styles.fmSettingsStylesFix}`}
                    >
                      {t('fileManager.showLocalPane')}
                    </Typography>
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={showLocalPane}
                          onChange={(e) =>
                            onShowLocalPaneChange(e, !showLocalPane)
                          }
                        />
                      }
                      label={
                        showLocalPane
                          ? t('common.enabled')
                          : t('common.disabled')
                      }
                    />
                    <Typography variant="caption">
                      {t('fileManager.localPaneDragNote')}
                    </Typography>

                    <Typography
                      variant="subtitle2"
                      className={`${styles.subtitle} ${styles.fmSettingsStylesFix}`}
                    >
                      {t('fileManager.showLocalPaneOnLeft')}
                    </Typography>
                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={showLocalPaneOnLeftSide}
                          onChange={(e) =>
                            onShowLocalPaneOnLeftSideChange(
                              e,
                              !showLocalPaneOnLeftSide
                            )
                          }
                        />
                      }
                      label={
                        showLocalPaneOnLeftSide
                          ? t('common.enabled')
                          : t('common.disabled')
                      }
                    />
                  </FormGroup>
                </div>
              </SettingsDialogTabContainer>
            )}

            {/* ----- Updates Tab ----- */}

            {tabIndex === this.tabBodyRenderTabIndex(2) && (
              <SettingsDialogTabContainer>
                <div className={styles.tabContainer}>
                  <FormGroup>
                    <Typography variant="subtitle2" className={styles.subtitle}>
                      {t('updates.autoCheck')}
                    </Typography>

                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={enableAutoUpdateCheck}
                          onChange={(e) =>
                            onAutoUpdateCheckChange(e, !enableAutoUpdateCheck)
                          }
                        />
                      }
                      label={
                        enableAutoUpdateCheck
                          ? t('common.enabled')
                          : t('common.disabled')
                      }
                    />
                  </FormGroup>

                  <FormGroup>
                    <Typography variant="subtitle2" className={styles.subtitle}>
                      {t('updates.autoDownload')}
                    </Typography>

                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={enableBackgroundAutoUpdate}
                          disabled={!enableAutoUpdateCheck}
                          onChange={(e) =>
                            onEnableBackgroundAutoUpdateChange(
                              e,
                              !enableBackgroundAutoUpdate
                            )
                          }
                        />
                      }
                      label={
                        enableBackgroundAutoUpdate
                          ? t('common.enabled')
                          : t('common.disabled')
                      }
                    />
                  </FormGroup>

                  <FormGroup>
                    <Typography
                      variant="subtitle2"
                      className={`${styles.subtitle} ${styles.subtitleMarginFix}`}
                    >
                      {t('updates.betaChannel')}
                    </Typography>

                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={enablePrereleaseUpdates}
                          disabled={isPrereleaseVersion()}
                          onChange={(e) =>
                            onPrereleaseUpdatesChange(
                              e,
                              !enablePrereleaseUpdates
                            )
                          }
                        />
                      }
                      label={
                        enablePrereleaseUpdates
                          ? t('common.enabled')
                          : t('common.disabled')
                      }
                    />
                  </FormGroup>
                  <Typography variant="caption">
                    {t('updates.betaWarning')}
                  </Typography>
                </div>
              </SettingsDialogTabContainer>
            )}

            {/* ----- Privacy Tab ----- */}

            {tabIndex === this.tabBodyRenderTabIndex(3) && (
              <SettingsDialogTabContainer>
                <div className={styles.tabContainer}>
                  <FormGroup>
                    <Typography variant="subtitle2" className={styles.subtitle}>
                      {t('privacy.analytics')}
                    </Typography>

                    <FormControlLabel
                      className={styles.switch}
                      control={
                        <Switch
                          checked={enableAnalytics}
                          onChange={(e) =>
                            onAnalyticsChange(e, !enableAnalytics)
                          }
                        />
                      }
                      label={
                        enableAnalytics
                          ? t('common.enabled')
                          : t('common.disabled')
                      }
                    />
                    <Typography variant="caption">
                      {t('privacy.description')}&nbsp;
                      <a
                        className={styles.a}
                        onClick={() => {
                          ipcRenderer.send(
                            IpcEvents.OPEN_HELP_PRIVACY_POLICY_WINDOW
                          );
                        }}
                      >
                        {t('privacy.learnMore')}
                      </a>
                    </Typography>
                  </FormGroup>
                </div>
              </SettingsDialogTabContainer>
            )}
          </FormControl>

          <FormControl component="fieldset" className={styles.fieldset} />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              onDialogBoxCloseBtnClick({
                confirm: false,
              })
            }
            color="primary"
            className={classNames(styles.btnPositive)}
          >
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

export default withTranslation('settings')(SettingsDialog);
